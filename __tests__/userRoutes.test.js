const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const { SECRET_KEY } = require("../config");


describe("Tests User Routes", function () {
  let testUserToken;

  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    let u1 = await User.register({
      username: "user1",
      password: "password1",
      first_name: "John",
      last_name: "Lennon",
      phone: "+123456789",
    });

    testUserToken = jwt.sign({ username: "user1" }, SECRET_KEY);
  });

  /** GET /users => {users: [...]}  */

  test("can get list of users", async function () {
    let response = await request(app)
      .get("/users")
      .send({ _token: testUserToken });

    expect(response.body).toEqual({
      users: [
        {
          username: "user1",
          first_name: "John",
          last_name: "Lennon",
          phone: "+123456789"
        }
      ]
    });
  });

  /** GET /users => {users: [...]}  */

  describe("GET /users/:username", function () {
    test("cannot get user", async function () {
      let response = await request(app)
        .get("/users/test1")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        user: {
          username: "user1",
          first_name: "John",
          last_name: "Lennon",
          phone: "+123456789",
          join_at: expect.any(String),
          last_login_at: expect.any(String),
        }
      });
    });

    test("401 on missing user", async function () {
      let response = await request(app)
        .get("/users/wrong")
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(401);
    });
  });
});


describe("Test User Message Routes", function () {
  let testUserToken;

  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    let u1 = await User.register({
      username: "user1",
      password: "password",
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

    testUserToken = jwt.sign({ username: "user1" }, SECRET_KEY);
  });

  /** GET /users/:username/to => {messages: [...]}  */

  describe("GET /users/:username/to", function () {
    test("Getting list of messages from user test", async function () {
      let response = await request(app)
        .get("/users/test1/to")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        messages: [
          {
            id: expect.any(Number),
            body: "user2 -> user1",
            sent_at: expect.any(String),
            read_at: null,
            from_user: {
              username: "user2",
              first_name: "Paul",
              last_name: "McCartney",
              phone: "+234567890",
            }
          }
        ]
      });
    });

    test("401 on non-existent user",  async function () {
      let response = await request(app)
        .get("/users/madeup/to")
        .send({ _token: testUserToken });
      expect(response.statusCode).toEqual(401);
    });

    test("401 on wrong auth",  async function () {
      let response = await request(app)
        .get("/users/test1/to")
        .send({ _token: "madeup" });
      expect(response.statusCode).toEqual(401);
    });
  });

    /** GET /users/:username/from => {messages: [...]}  */

    describe("GET /users/:username/from", function () {
      test("Getting list of messages from user test", async function () {
        let response = await request(app)
          .get("/users/test1/from")
          .send({ _token: testUserToken });

        expect(response.body).toEqual({
          messages: [
            {
              id: expect.any(Number),
              body: "user1 -> user2",
              sent_at: expect.any(String),
              read_at: null,
              to_user: {
                username: "user2",
                first_name: "Paul",
                last_name: "McCartney",
                phone: "+234567890",
              }
            }
          ]
        });
      });

      test("401 if user does not exist",  async function () {
        let response = await request(app)
          .get("/users/madeup/from")
          .send({ _token: testUserToken });
        expect(response.statusCode).toEqual(401);
      });

      test("401 on bad authentication",  async function () {
        let response = await request(app)
          .get("/users/test1/from")
          .send({ _token: "madeup" });
        expect(response.statusCode).toEqual(401);
      });
    });
});

afterAll(async function () {
  await db.end();
});
