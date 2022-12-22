const request = require("supertest");
var cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Creates a todo...", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Mark a todo as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    console.log(groupedTodosResponse.text);
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    console.log(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodayTodos.length;
    const latestTodo = parsedGroupedResponse.duetodayTodos[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markAsCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}/markAsCompleted`)
      .send({
        _csrf: csrfToken,
      });
    const parsedUpdateResponse = JSON.parse(markAsCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
});
// test("Fetches all todos in the database using /todos endpoint", async () => {
//   await agent.post("/todos").send({
//     title: "Buy xbox",
//     dueDate: new Date().toISOString(),
//     completed: false,
//   });
//   await agent.post("/todos").send({
//     title: "Buy ps3",
//     dueDate: new Date().toISOString(),
//     completed: false,
//   });
//   const response = await agent.get("/todos");
//   const parsedResponse = JSON.parse(response.text);

//   expect(parsedResponse.length).toBe(4);
//   expect(parsedResponse[3]["title"]).toBe("Buy ps3");
// });

//   test("Deletes a todo with the given ID if it exists and sends a boolean response", async () => {
//     // FILL IN YOUR CODE HERE
//     const response = await agent.post("/todos").send({
//       title: "Del todo",
//       dueDate: new Date().toLocaleString(),
//       completed: false,
//   });
//   const parsedResponse = JSON.parse(response.text);
//   const todoID = parsedResponse.id;
//   const deletedTodoResponse = await agent.destroy(`/todos/${todoID}`).send();
//   const parsedDetachResponse = JSON.parse(deletedTodoResponse.text);
//   expect(parsedDetachResponse).toBe(true);

//   });
