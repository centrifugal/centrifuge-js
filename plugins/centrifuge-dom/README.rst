To make things even more simple ``centrifuge.dom.js`` jQuery plugin can be used.

In most cases you application does not need all real-time features of Centrifuge.
If your application does not need complicated subscription management, dynamic channels
then ``centrifuge.dom.js`` can help you a lot.

Many of you heard about AngularJS or KnockoutJS. Those libraries use html attributes
to control application behaviour. When you change attributes and their values you
change your application logic. This is very flexible technique. Why not use this power
to add some real-time on your site.

First, add ``centrifuge.dom.js`` on your page:

.. code-block:: html

    <script src="https://rawgit.com/centrifugal/centrifuge-js/master/plugins/centrifuge-dom/centrifuge.dom.js"></script>


Note, that ``centrifuge.dom.js`` requires **jQuery**!

When enabled that plugin searches for special html-elements on your page, creates a
connection to Centrifuge, subscribes on necessary channels and triggers event on
html-elements when new message from channel received.

All you need to do in this case is write how your page will react on new messages:

.. code-block:: javascript

    $('#html-element').on('centrifuge.message', function(event, message) {
        console.log(message.data);
    });


Let's see how it looks in practice. Consider comments for example.

The user of your web application writes a new comment, clicks submit button.
Your web application's backend processes new data, validates it, saves as
usually. If everything ok you then must send POST request with comment data
into Centrifuge so that new comment will appear on the screen of all connected
clients.

Let's make it work in five steps.

STEP 1) Add all necessary scripts into your web application's main template.
These are ``jQuery``, ``SockJS`` (optional, use can use pure WebSockets), ``centrifuge.js``, ``centrifuge.dom.js``

STEP 2) In main template initialize plugin:

.. code-block:: javascript

    $(function(){
        $.centrifuge_dom({});
    });


STEP 3) Also add html-elements with proper attributes in main template with connection
address, token, user ID values.

.. code-block:: html

    <div id="centrifuge-address" data-centrifuge-value="{{ centrifuge_address }}"></div>
    <div id="centrifuge-user" data-centrifuge-value="{{ centrifuge_user }}"></div>
    <div id="centrifuge-timestamp" data-centrifuge-value="{{ centrifuge_timestamp }}"></div>
    <div id="centrifuge-token" data-centrifuge-value="{{ centrifuge_token }}"></div>


Here I use syntax of Django templates. In your case it can look slightly different.
The values of connection address, token, user ID must provide your
web app's backend.

STEP 4) On the page with comments add the following html-element with channel and namespace
names in attributes

.. code-block:: html

    <div class="centrifuge" id="comments-handler" data-centrifuge-channel="comments" data-centrifuge-namespace="public"></div>

STEP 5) On the same page add some javascript

.. code-block:: javascript

    $(function() {
        $("#comments-handler").on("centrifuge.message", function(event, message) {
            $("body").append(message.data);
        });
    });


That's all, baby!

Moreover now to to add some new real-time elements on your pages you only need to do
last two steps.

In some scenarios you need to handle errors and disconnects. This can be done by listening
for ``centrifuge.disconnect`` and ``centrifuge.error`` events on handler elements.

For example

.. code-block:: javascript

    $("#comments-handler").on("centrifuge.disconnect", function(event, err) {
        console.log("disconnected from Centrifuge");
    });


