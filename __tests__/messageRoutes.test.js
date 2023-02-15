const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const {SECRET_KEY} = require("../config");


describe('Tests Message Routes', function () {
  let testUserToken;
  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");
    await db.query("ALTER SEQUENCE messages_id_seq RESTART WITH 1");

    let u1 = await User.register({
      username: "user1",
      password: "password1",
      first_name: "John",
      last_name: "Lennon",
      phone: "+123456789",
    });

    let u2 = await User.register({
      username: "user2",
      password: "password2",
      first_name: "Paul",
      last_name: "McCartney",
      phone: "+234567890",
    });

    let u3 = await User.register({
      username: "user3",
      password: "password3",
      first_name: "George",
      last_name: "Harrison",
      phone: "+14155553333",
    });

    let m1 = await Message.create({
      from_username: "user1",
      to_username: "user2",
      body: "user1 -> user2",
    });

    let m2 = await Message.create({
      from_username: "user2",
      to_username: "user1",
      body: "user2 -> user1",
    });

    let m3 = await Message.create({
      from_username: "user2",
      to_username: "user3",
      body: "user2 -> user3",
    });

    testUserToken = jwt.sign({ username: "user1" }, SECRET_KEY);
  });

  /** GET /messages:/id => {message}  */

  describe("GET /messages/:id", function () {
    test("Getting message from user test", async function () {
      let response = await request(app)
        .get("/messages/1")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        message: {
          id: 1,
          body: "user1 -> user2",
          sent_at: expect.any(String),
          read_at: null,
          from_user: {
            username: "user1",
            first_name: "John",
            last_name: "Lennon",
            phone: "+14155550000"
          },
          to_user: {
            username: "test2",
            first_name: "Paul",
            last_name: "McCartney",
            phone: "+123456789",
          }
        }
      });
    });

    test("Getting message from user", async function () {
      let response = await request(app)
        .get("/messages/2")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        message: {
          id: 2,
          body: "user2 -> user1",
          sent_at: expect.any(String),
          read_at: null,
          to_user: {
            username: "user1",
            first_name: "John",
            last_name: "Lennon",
            phone: "+123456789"
          },
          from_user: {
            username: "user2",
            first_name: "Paul",
            last_name: "McCartney",
            phone: "+234567890",
          }
        }
      });
    });

    test("invalid message id", async function () {
      let response = await request(app)
        .get("/messages/4000")
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(404);
    });

    test("message not sent or recieved", async function () {
      let response = await request(app)
        .get("/messages/3")
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(401);
    });
  });

  /** POST / => {message} */

  describe("POST /", function () {
    test("message won't post", async function () {
      let response = await request(app)
        .post("/messages/")
        .send({
          to_username: "user2",
          body: "another user1 -> user2",
          _token: testUserToken
        });

      expect(response.body).toEqual({
        message: {
          id: 4,
          sent_at: expect.any(String),
          from_username: "user1",
          to_username: "user2",
          body: "another user1 -> user2"
        }
      });
    });

    test("Can't send to invalid user", async function () {
      let response = await request(app)
        .post("/messages/")
        .send({
          to_username: "madeup_user",
          body: "nonsense",
          _token: testUserToken
        });

      expect(response.statusCode).toEqual(500);
    });
  });

  /** POST /messages:/id/read => {message: id, read_at}  */

  describe("POST /messages/:id/read", function () {
    test("messages can be marked 'read' ", async function () {
      let response = await request(app)
        .post("/messages/1/read")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        message: {
          id: 1,
          read_at: expect.any(String),
        }
      });
    });

    test("invalid message id", async function () {
      let response = await request(app)
        .post("/messages/2000/read")
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(404);
    });

    test("can't mark other messages as read", async function () {
      let response = await request(app)
        .post("/messages/1/read")
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(401);
    });
  });
});

afterAll(async function () {
  await db.end();
});
