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

class Talk {
  constructor(talk, dispatch) {
    this.comments = elt("div");
    this.dom = elt(
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
      this.comments,
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
    this.syncState(talk); // Initilize and update this.talk, which is needed for component talk with DOM.
  }

  syncState(talk) {
    this.talk = talk;
    this.comments.textContent = "";
    for (let comment of talk.comments) {
      this.comments.appendChild(renderComment(comment));
    }
  }
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
    this.talkMap = Object.create(null);
    this.dom = elt("div", null,
                   renderUserField(state.user, dispatch),
                   this.talkDOM,
                   renderTalkForm(dispatch));
    this.syncState(state);
  }

  syncState(state) {
    if (this.talks == state.talks) return;
    this.talks = state.talks;
    for (let talk of state.talks) {
      let cmp = this.talkMap[talk.title];
      if (cmp && cmp.talk.presenter == talk.presenter
          && cmp.talk.summary == talk.summary) {
        cmp.syncState(talk);
      } else {
        if(cmp) cmp.dom.remove();
        cmp = new Talk(talk, this.dispatch);
        this.talkMap[talk.title] = cmp;
        this.talkDOM.appendChild(cmp.dom);
      }
    }
    for (let title of Object.keys(this.talkMap)) {
      if (!state.talks.some(t => t.title == title)) {
        this.talkMap[title].dom.remove();
        delete this.talkMap[title];
      }
    }
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
