const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const path = require('path')

const mongoose = require('mongoose')
const User = require('./model/user'); 

const PORT = 3003
const session = require('express-session')

const logger = require('morgan')
app.use(logger('dev'));

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/static',express.static(path.join(__dirname,'/public')))

//caching disable
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.use(cookieParser())
app.use(session({
  secret: 'secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

  
//Connect Mongodb
const dbURI = 'mongodb://localhost:27017/mydb'
mongoose.connect(dbURI)
.then((result)=>app.listen(PORT))
.catch((err)=>console.log(err))

//set view engine
app.set('view engine','ejs')

  app.get('/', (req, res) => {
    if (req.session.user) {
      res.redirect('/dashboard')
    } else {
      res.render('login', { message: '', errmsg: "" })
    }
  })

//login post route
app.post('/',async(req, res) => {
  try{
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (email === user.email && password === user.password) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else {
        res.render('login', { title: "Express", login: "Wrong credentials" });
    }
  }
  catch (error) {
    res.redirect('/?login=Please Enter your Credentials!');
  }
});
  
 
 



    //dashboard route
    app.get('/dashboard', (req, res) => {
      if (req.session.user) {
        res.render('dashboard', { user: req.session.user });
      } else {
        res.redirect('/login');
      }
    });


//logout
app.get('/logout', (req, res) => {
  req.session.destroy(function (err) {
    if (err) {
      console.log(err);
      res.send("Error")
    } else {
      res.render("login", { title: "Express", logout: "Logout Succesfully" })
    }
  })
})

app.get('/register', (req, res) => {
  const message = req.query.message;
  const type = 'success'; 

  res.render('register', { message,type  });
});






 //admin dashboard create user Post  Route
 app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.render('register', { message: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If email is already in use, alert the user
      return res.render('register', { message: 'Email already in use! Please login.' });
    }

    // Check if the name is already in use
    const existingName = await User.findOne({ name });
    if (existingName) {
      // If name is already in use, alert the user
      return res.render('register', { message: 'Name already in use! Please choose another name.' });
    }

    // Check if the password is already in use
    const existingPassword = await User.findOne({ password });
    if (existingPassword) {
      // If password is already in use, alert the user
      return res.render('register', { message: 'Password already in use! Please use a different password.' });
    }

    // If none of the fields are already in use, create a new user
    const newUser = new User({
      name,
      email,
      password
    });

    // Save the new user to the database
    await newUser.save();
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

//admin get
app.get('/admin', (req,res)=>{
  const message = req.query.message;
    res.render('admin',{message})
})

//admin post
app.post('/admin', (req, res) => {
  const { adminMail, password } = req.body;

  const AdminMail = 'admin@admin.com';
  const AdminPassword = 'password';
 
  if (adminMail && password) {
    console.log(req.body);

    if (adminMail === AdminMail && password === AdminPassword) {
      req.session.admin = { adminMail: AdminMail }; // Store admin info in session
      res.redirect('/admin-dashboard');
    } else {
      res.render('admin', { message: 'Invalid admin credentials' });
    }
  } else {
    //res.render('admin', { message: 'Please provide credentials' });
   }
});



 // admin-dashboard get
app.get('/admin-dashboard', async (req, res) => {
  try {
    const users = await User.find();
    if (req.session.admin) {
       
      res.render('admin-dashboard',{ users  ,message: 'Your message here' });
    } else {
      res.redirect('/admin');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// get user adding page
app.get('/add-user', async (req, res) => {
  try {
      if (req.session.admin) {
        res.render("admin_add_user", { title: "Admin add User", message: req.session.message })
      } else {
          res.render('admin', { message: "Relogin Needed"});
      }
  } catch (err) {
      console.error("Error in admin-add-user route:", error);
      res.status(500).send("Internal Server Error");
  }
})


// post new user data to databse
app.post('/add', async (req, res) => {
  try {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
          req.session.message = {
              type: "danger",
              message: "Email already exists!"
          };
          return res.redirect('/add-user');
      }

      const user = new User({
          name: req.body.name,
          email: req.body.email,
          password: req.body.password
      });
      await user.save();
      req.session.message = {
          type: "success",
          message: "User added successfully."
      };
      res.redirect("/admin-dashboard");
  } catch (error) {
      console.error("Error in admin-add-user route:", error);
      res.status(500).send("Internal Server Error in add");
  }
});


//route to get the admin user edit page
app.get('/edit/:id', (req, res) => {
  let id = req.params.id
  User.findById(id)
      .then((user) => {
          if (user == null) {
              res.redirect('/admin-dashboard')
          } else {
              res.render("admin-edituser", { title: "Admin Edit User", user: user,message:'' })
          }
      })
      .catch((err) => {
          res.redirect('/admin-dashboard')
      })
})


// app.post('/update/:id', async (req, res) => {
//   const id = req.params.id;

//   try {
//     //const existingUser = await User.findOne({ email: req.body.email });
//     // if (existingUser && existingUser._id.toString() !== id) {
//     //   req.session.message = {
//     //     type: "danger",
//     //     message: "Email already exists!"
//     //   };
//     //   return res.redirect(`/edit/${id}`);
//     // }

//     // Update the user's information
//     await User.findByIdAndUpdate(id, {
//       name: req.body.name,
//       email: req.body.email
//     });

//     if (req.session.admin) {
//       req.session.message = {
//           type: "success",
//           message: "User updated successfully."
//       };
//       res.redirect('/admin-dashboard');
//   } else {
//       res.render("admin", { title: "Admin Login", type: "danger", message: "Relogin needed!" });
//   }
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// });


// app.post('/update/:id', async (req, res) => {
//   const id = req.params.id;
//   const { name, email } = req.body;
// console.log(req.body);
// //   if (!name || !email) {
// //       return res.status(400).send("Name and email are required");
// //   }

// //   try {
// //       await User.findByIdAndUpdate(id, {
// //           name: name,
// //           email: email
// //       });
// //       // Send a success response or perform additional actions if needed
// //       res.send('success')
// //   } catch (error) {
// //       // Handle the error (e.g., send an error response)
// //       console.error(error);
// //       res.status(500).send("Internal Server Error");
// //     }
// });

//   // admin-dashboard update Post route
  
app.post('/update/:id', async (req, res) => {
  const userId = req.params.id; 
  const { name, email } = req.body;

  if (!userId || !name || !email) {
    return res.status(400).send('Missing required fields');
  }


  try {
    const existinguser = await User.findOne({ email: req.body.email });
        if (existinguser && existinguser._id.toString() !== userId) {
            // If the email exists for another user, redirect back to the edit page
            req.session.message = {
                type: "danger",
                message: "Email already exist!"
            }
            return res.redirect(`/edit/${userId}`);
        }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }
    
    res.redirect('/admin-dashboard');
  } catch (error) {
    res.status(500).send(error.message);
  }
});


//route to return back from edit page to admin dashboard
app.get('/editback', (req, res) => {
  try {
      if (!req.session.admin) {
          res.render("admin", { titlle: "Admin Login", type : "danger", message: "Relogin needed!" })
      } else {
          res.redirect('/admin-dashboard')
      }
  } catch (err) {
      res.render("admin", { titlle: "Admin Login", type : "danger", message: "Relogin needed" })
      console.log(err)
  }
})


app.get('/delete/:id', (req, res) => {
  let id = req.params.id;
  User.findByIdAndDelete(id)
      .then((result) => {
          
          res.redirect('/admin-dashboard');
      })
      .catch((err) => {
          if (req.session.admin) {
              req.session.message = {
                  type: "danger",
                  message: "Error in user deletion!"
              };
              res.redirect('/admin-dashboard');
              console.log("Error in user deletion: ", err);
          } else {
              res.render("admin", { title: "Admin Login", type: "danger", message: "Relogin needed!" });
          }
      });
});


// admin logout
app.get('/admin-logout', async (req, res) => {
  try {
      res.clearCookie('myCookie');
      req.session.destroy(function (err) {
          if (err) {
              console.error("Error during admin logout:", err);
              res.status(500).send("Internal Server Error");
          } else {
              res.header('cache-control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
              res.render('admin', { title: "Admin Login", message: "Logout successfully", type: "success" });
          }
      });
  } catch (error) {
      console.error("Error in admin-logout route:", error);
      res.status(500).send("Internal Server Error");
  }
});








// app.listen(3003,()=>{
//     console.log("Listening to the server on http://localhost:3003")
// })