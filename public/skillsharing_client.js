function handleAction(state, action) {
  if (action.type == "setUser") {
    localStorage.setItem("userName", action.user);
    return Object.assign({}, state, {user: action.user});
  } else if (action.type == "setTalks") {
    return Object.assign({}, state, {talks: action.talks});
  } else if (action.type == "newTalk") {
    fetchOK(talkURL(action.title), {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        presenter: state.user,
        summary: action.summary
      })
    }).catch(reportError);
  } else if (action.type == "deleteTalk") {
    fetchOK(talkURL(action.talk), {
      method: "DELETE"
    }).catch(reportError);
  } else if (action.type == "newComment") {
    fetchOK(talkURL(action.talk) + "/comments", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        author: state.user,
        message: action.message
      })
    }).catch(reportError);
  }
  return state;
}

function fetchOK(url, option) {
  return fetch(url, option).then(response => {
    if (response.status < 400) return response;
    else throw new Error(response.statusText);
  });
}

function talkURL(path) {
  return "/talks/" + encodeURIComponent(path);
}

function reportError(error) {
  alert(String(error));
}

// Components renderer
function elt(type, props, ...children) {
  let dom = document.createElement(type);
  if (props) Object.assign(dom, props);
  for (let child of children) {
    if (typeof child != "string") dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }
  return dom;
}

function renderUserField(name, dispatch) {
  return elt("label", {}, "Name: ",
             elt("input", {
               type: "text",
               value: name,
               onchange(event) {
                 dispatch({type: "setUser", user: event.target.value});
               }
  }));
}

function renderTalk(talk, dispatch) {
  return elt(
    "section", {className: "talk"},
    elt("h2", null, talk.title, " ",
        elt("button", {
          type: "button",
          onclick() {
            dispatch({type: "deleteTalk", talk: talk.title});
          }
        }, "Delete")),
    elt("div", null, "by ",
        elt("strong", null, talk.presenter)),
    elt("p", null, talk.summary),
    ...talk.comments.map(renderComment),
    elt("form", {
        onsubmit(event) {
          event.preventDefault();
          let form = event.target;
          dispatch({
            type: "newComment",
            talk: talk.title,
            message: form.elements.comment.value
          });
          form.reset();
        }
    },
        elt("textarea", {name: "comment"}), " ",
        elt("button", {type: "submit"}, "Send"))
  );
}

function renderComment(comment) {
  return elt("p", {className: "comment"},
            elt("strong", null, comment.author),
            ": ", comment.message);
}

function renderTalkForm(dispatch) {
  let title   = elt("input", {type: "text", name: "title"});
  let summary = elt("input", {type: "text", name: "summary"});
  return elt("form", {
    onsubmit(event) {
      event.preventDefault();
      dispatch({
        type: "newTalk",
        title: title.value,
        summary: summary.value
      });
      event.target.reset();
    }
  }, elt("h3", null, "Submit a Talk"),
     elt("label", {for: title.name}, "Title:"),
     title, elt("br"),
     elt("label", {for: summary.name}, "Summary:"),
     summary, elt("br"),
     elt("button", {type: "submit"}, "Create"));
}

async function pollTalks(update) {
  let tag = undefined;
  for (;;) {
    let response;

    try {
      response = await fetchOK("/talks", {
        headers: tag && {
          "If-None-Match": tag,
          "Prefer": "wait=90"
        }
      });
    } catch (error) {
      console.log("Request failed: " + error);
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    if (response.status == "304") continue;
    tag = response.headers.get("Etag"); // without "get", same result.
    update(await response.json());
  }
}

// The following component ties the app together
class SkillSharingApp {
  constructor(state, dispatch) {
    this.dispatch = dispatch;
    this.talkDOM = elt("div", {className: "talks"});
    this.dom = elt("div", null,
                   renderUserField(state.user, dispatch),
                   this.talkDOM,
                   renderTalkForm(dispatch));
    this.syncState(state);
  }

  syncState(state) {
    if (state.talks != this.talks) { // redrawing, needs to be dealt with in exercise.
      this.talkDOM.textContent = "";
      for (let talk of state.talks) {
        this.talkDOM.appendChild(
          renderTalk(talk, this.dispatch)
        );
      }
    }
    this.talks = state.talks;
  }
}

function runApp() {
  let user = localStorage.getItem("userName") || "";
  let state, app;
  function dispatch(action) {
    state = handleAction(state, action);
    app.syncState(state);
  }

  pollTalks(talks => {
    if (!app) {
      state = {user, talks};
      app = new SkillSharingApp(state, dispatch);
      document.body.appendChild(app.dom);
    } else {
      dispatch({type: "setTalks", talks});
    }
  }).catch(reportError);
}

runApp();
