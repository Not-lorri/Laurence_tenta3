//server.js
const express = require('express'), server = express();
const session = require('express-session');
const bcrypt = require('bcrypt');

const fs = require("fs");
const bodyParser = require('body-parser');

//Prisma
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
      
var path = require('path');
const { error } = require('console');
const { get } = require('http');

server.use(express.static(path.join(__dirname, 'public')));
server.use(bodyParser.urlencoded({ extended: true }));
server.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));

//Port
const port = 3003;

//setting the port.
server.set('port', process.env.PORT || port);


//Adding routes
server.get('/public',(request,response)=>{
 response.sendFile(__dirname + '/public/index.html');
});

server.get('/public/create.html',(request,response)=>{
    response.sendFile(__dirname + '/public/create.html');
});

server.get('/adminPage',(request,response)=>{
    response.sendFile(__dirname + '/public/adminPage.html');
});

server.get('/userPage',(request,response)=>{
    response.sendFile(__dirname + '/public/userPage.html');
});
   

server.listen(port,()=>{
    console.log(`Express server started at port ${port}` );
});

const authenticate = async (req, res, next) => {
  if (req.session.authorId) {
    try {
        const user = await prisma.Post.findUnique({
          where: { id: req.session.authorId },
        });

        if (user) {
          req.user = user;
          console.log('Authenti user:', user);
          next();
        } else {
          console.log('User not found.');
          redirectToHomeWithError(res, 'User not found.');
        }
    } catch (error) {
      console.error('Error fetching user:', error);
      redirectToHomeWithError(res, 'Error fetching user.');
    }
  } else {
    console.log('User not authenticated.');
    redirectToHomeWithError(res, 'User not authenticated.');
  }
};


server.post('/createUser', async(req, res) => {
    const createUser = async() => {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        try {
            const newdata = await prisma.User.create({
                data: {
                    username: req.body.userName,
                    password: hashedPassword,
                    role: req.body.roleChecker
                },
            });
            console.log("New data created", newdata)
            req.session.authorId = newdata.id;
            res.redirect('/index.html')
        } catch (error) {
            console.error("It didn't work", error)
        }
        finally{
            await prisma.$disconnect()
        }
    }

    createUser();
});

// User Login
server.post('/login', async(req, res) => {
    const {password, role} = req.body;

    try {
        const getUser = await prisma.User.findUnique({
            where: {
                username: req.body.userName,
                role
            }
        })


        if(getUser && (await bcrypt.compare(password, getUser.password)) && getUser.role === 'Admin') {
            req.session.authorId = getUser.id;
            res.redirect('/adminPage');
        } else if (getUser && (await bcrypt.compare(password, getUser.password)) && getUser.role === 'User') {
            req.session.authorId = getUser.id;
            res.redirect('/userPage');
        } else {
            console.log("Invalid username or password!");
            res.redirect('/public')
        }
    }  catch  (error) {
        console.log(error);
    }
});

//User Logout
server.get('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/public');
})

server.post('/createPost', async (req, res) => {
    const postData = {
        title: req.body.titlePost,
        description: req.body.description,
        image: req.body.blogImg
    };

    try {
        const newPost = await prisma.Post.create({
            data: postData,
        });

        console.log('New post created:', newPost);
        res.redirect('/adminPage'); // Redirect to the appropriate page after creating a post
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('Internal Server Error'); // Handle errors appropriately
    }
});

server.get