# CPSC 452 Final Project - Secure Chat 

Implementing a secure chat web application.

## Authors

- David Dao
- Austin Greene
- Julia Nguyen
- Brian Rector
- Chris Tarazi

## Our Node.js Stack

- [Node.js](https://nodejs.org/en/)
- [Express.js](http://expressjs.com/), [Passport.js](http://passportjs.org/), [Socket.io](http://socket.io/)
- [Pug templates](https://github.com/pugjs/pug)
- [MongoDB](https://www.mongodb.org/)
- [Redis](http://redis.io/)
- [Bower](https://www.npmjs.com/package/bower)
- [CryptoJS](https://github.com/brix/crypto-js)

### Setting up dev environment

```shell
$ sudo apt-get install nodejs npm       # Install node.js and npm package manager.
$ sudo npm install bower -g --save      # Install bower globally to manage our client side JS libraries.
$ npm install                           # Will install all the dependencies in the `package.json` file.
$ bower install                         # Will install all the dependencies in the `bower.json` file.
```

**Note:** For Ubuntu, please run the following:  

```shell
$ sudo ln -s /usr/bin/nodejs /usr/bin/node

# If you get the following error:
ln: failed to create symbolic link ‘/usr/bin/node’: File exists
# You are OK to proceed.
```

**Another note:** When you run `bower install`, it will create a directory called `bower_components` under the root. Please move that under `public/`.

```shell
mv bower_components public/
```

## Application architecture
    
```shell
Root directory
├── package.json            # Metadata for our application (lists all dependencies, etc.)
├── bower.json              # Like `package.json` but for bower (package manger for client side JS libs)
├── public                  # Static folder; all .js, .html, .css, images, etc. goes here.
│   └── index.js            # Client side JS for the main page (index).
├── server.js               # Our application.
└── views                   # All .pug (html) files go here.
    ├── index.pug           # Our homepage.
    ├── login.pug           # The login page.
    └── register.pug        # The registration page.
```

