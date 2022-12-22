const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const { Todo } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

//set EJS as view engine
app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (request, response) => {
  try {
    const overdueTodos = await Todo.overdue();
    const duetodayTodos = await Todo.dueToday();
    const duelaterTodos = await Todo.dueLater();
    if (request.accepts("html")) {
      response.render("index", {
        title: "To-Do Manager",
        overdueTodos,
        duetodayTodos,
        duelaterTodos,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        overdueTodos,
        duetodayTodos,
        duelaterTodos,
      });
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

// eslint-disable-next-line no-undef
app.get("/todos", async function (_request, response) {
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

// First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
// Then, we have to respond with all Todos, like:
// response.send(todos)

app.get("/todos/:id", async function (request, response) {
  try {
    const todos = await Todo.findByPk(request.params.id);
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async (request, response) => {
  console.log("Creating a todo", request.body);
  try {
    await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

//PUT  url
app.put("/todos/:id/markAsCompleted", async (request, response) => {
  console.log("we have to update a todo with ID:", request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.markAsCompleted();
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("We have to delete a Todo with ID: ", request.params.id);
  try {
    await Todo.remove(request.params.id);
    return response.json({ sucess: true });
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
