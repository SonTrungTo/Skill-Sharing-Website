# Project: A skill-sharing website.
This projects builds a small chat app website that encourages information exchanges
between people on various topics.

# Server side
## talks dir
This dir is for containing interface of HTTP request, which includes each sub
dir in which it contains a JSON file like: (method: "PUT")

[{"title": "Unituning", <br />
  "presenter": "Jamal", <br />
  "summary": "Modifying your cycle for extra style", <br />
  "comment": [ ]}] <br />
<br />
PUT /talks/Unituning

URL needs to be encode since it will contain spaces: <br />
console.log("/talks/"+ encodeURIComponent("Swimmming in a river"));

Client(If-None-Match: String(4)) vs Server(ETag: String(5)) ? server will
response if different. To differentiate from normal conditional request
and long polling, we use Prefer: wait=90

## router.js
This dispatches the requests to another function handling those.

## skillSharingServer.js
including a server which handles requests and responses for two cases:

* `/talks/`: which is handled via router. Client uses HTTP for this.
* `/public/`: if the url pattern does not match, this is the default path for serving files.

Incidentally, it wraps the server in an object that also holds its state (talks).

`this.talks` contains `talks` object whose properties are the titles of the talks.
We are now adding HTTP methods (thanks to handler) for the clients to use them.

* GET
* DELETE
* PUT
* POST

We also add support for long polling. `talkResponse()` is a helper method
for the server that returns an array of talks along with `ETag` headers to the client.
The handler will also check if the request headers for `If-no-match` and `Prefer`
(case insensitive) to distinguish between normal conditional request and
long polling one.

# Client side (./public)
## index.html
Automatically found by `ecstatic` package.

## skillsharing_client.js
script for the page: {talks, user} object along with
state management in `handleAction`. It also contains
components renderer.

## skillsharing.css
And of course, its css.
