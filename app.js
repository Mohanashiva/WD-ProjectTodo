const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
const flash = require("connect-flash");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.use(bodyParser.json());

//set EJS as view engine
app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());

app.get("/", async (request, response) => {
  response.render("index", {
    title: "Todo application",
    csrfToken: request.csrfToken(),
  });
});
app.use(
  session({
    secret: "my-secret-super-key-10181810",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch(function () {
          return done(null, false, { message: "Unrecognized Email" });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const loggedInUserId = request.user.id;
      const overdueTodos = await Todo.overdue(loggedInUserId);
      const duetodayTodos = await Todo.dueToday(loggedInUserId);
      const duelaterTodos = await Todo.dueLater(loggedInUserId);
      const completedTodos = await Todo.completedTodos(loggedInUserId);
      if (request.accepts("html")) {
        response.render("todos", {
          title: "To-Do Manager",
          overdueTodos,
          duetodayTodos,
          duelaterTodos,
          completedTodos,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          overdueTodos,
          duetodayTodos,
          duelaterTodos,
          completedTodos,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// eslint-disable-next-line no-undef
app.get("/todos", async function (_request, response) {
  console.log("processing list of all todos..");
  try {
    const todos = await Todo.findAll({
      order: [["id", "ASC"]],
    });
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
});
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  //console.log("Firstname", request.body.firstName)
  if (request.body.firstName == false) {
    request.flash("error", "Please Enter Your First Name");
    return response.redirect("/signup");
  }
  if (request.body.lastName == false) {
    request.flash("error", "Please Enter Your Last Name");
    return response.redirect("/signup");
  }
  if (request.body.password == false) {
    request.flash("error", "Please Enter Password");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 8) {
    request.flash(
      "error",
      "Yout password length should be minimum of 8 characters!"
    );
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);

  //have to create the user here
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/todos");
      }
    });
  } catch (error) {
    request.flash("error", error.message);
    return response.redirect("/signup");
  }
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/todos");
  }
);
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Sign Up",
    csrfToken: request.csrfToken(),
  });
});
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

// First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
// Then, we have to respond with all Todos, like:
// response.send(todos)

app.get(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo = await Todo.findByPk(request.params.id);
      return response.json(todo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    if (request.body.title.length < 4) {
      request.flash("error", "To-Do is not long enough");
      return response.redirect("/todos");
    }
    let dueDateError = request.body.dueDate;
    if (dueDateError == false) {
      request.flash("error", "Please pick a date");
      return response.redirect("/todos");
    }
    try {
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//PUT  url
app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      await Todo.findByPk(request.params.id);

      const todo = await Todo.findByPk(request.params.id);
      const updatedTodo = await todo.setCompletionStatus(
        request.body.completed
      );
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete("/todos/:id", async function (request, response) {
  console.log("We have to delete a Todo with ID: ", request.params.id);
  try {
    const loggedInUserId = request.user.id;
    const result = await Todo.remove(request.params.id, loggedInUserId);
    return response.json({ success: result == 1 });
  } catch (error) {
    return response.status(422).json(error);
  }
  // FILL IN YOUR CODE HERE
  // const ThedeletedTodo = await Todo.destroy({
  //   where: { id: request.params.id },
  // });
  // return response.send(ThedeletedTodo ? true : false);
  // First, we have to query our database to delete a Todo by ID.
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
});

module.exports = app;
