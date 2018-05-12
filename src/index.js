var express = require('express');
var { GraphQLServer } = require('graphql-yoga');
var { buildSchema } = require('graphql');
var casual = require('casual');
var uuid = require('uuid/v4');
var { createConnection, EntitySchema } = require('typeorm');
require("dotenv").config();
const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
});

const User = sequelize.define('user', {
    id: {
      type: Sequelize.INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
      default: 1
    },
    name: Sequelize.STRING,
    description: Sequelize.STRING,
    headLine: Sequelize.STRING,
    image: Sequelize.STRING,
    points: Sequelize.INTEGER,
    created: Sequelize.STRING,
    type: Sequelize.ENUM('REGULAR', 'COP')
});
const Tag = sequelize.define('tag', {
    id: {
      type: Sequelize.INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
      default: 1
    },
  text: Sequelize.STRING
});

const Comment = sequelize.define('comment', {
    id: {
      type: Sequelize.INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
      default: 1
    },
    description: Sequelize.STRING
});

const Answer = sequelize.define('answer', {
    id: {
      type: Sequelize.INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
      default: 1
    },
    title: Sequelize.STRING,
    description: Sequelize.STRING,
    totalVotes: Sequelize.INTEGER,
    created: Sequelize.STRING,
    //creator: User,
    accepted: Sequelize.BOOLEAN,
    type: Sequelize.ENUM('QUESTION', 'ARTICLE'),
   //include: [Comment]
});

const Post = sequelize.define('post', {
    id: {
      type: Sequelize.INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
      default: 1
    },
    title: Sequelize.STRING,
    description: Sequelize.STRING,
    totalVotes: Sequelize.INTEGER,
    created: Sequelize.STRING,
    //creator: User,
    insideOnly: Sequelize.BOOLEAN,
    type: Sequelize.ENUM('QUESTION', 'ARTICLE'),
   //include: [Comment, Tag, Answer]
});

Post.hasMany(Tag);
Post.hasMany(Comment);
Post.hasMany(Answer);
Post.belongsTo(User);

//User.hasMany(Post);
User.hasMany(Comment);
User.hasMany(Answer);

Answer.hasMany(Comment);

var typeDefs = `
    type Query {
      posts: [Post]
      post(id: ID): Post
      user(id: ID): User
      answersByUser(userId: ID): [Answer]
    }
    type Mutation {
      createUser(name: String): User 
      createPost(type: PostType, title: String, userID: ID): Post
      createComment(description: String, userID: ID, postID: ID, answerID: ID): Comment
      createAnswer(title: String, description: String, userID: ID, postID: ID): Answer
      createTag(text: String, postID: ID): Tag
    }
    interface Commentable {
        id: ID
    }
    type Post implements Commentable{
        id: ID
        title: String
        description: String
        totalVotes: Int
        created: String
        creator: User
        insideOnly: Boolean
        type: PostType
        comments: [Comment]
        answers: [Answer]
        tags: [Tag]
    }
    enum PostType {
        QUESTION
        ARTICLE
    }
    type User {
        id: ID
        name: String
        description: String
        headLine: String
        image: String
        points: Int
        created: String
        type: UserType
    }
     enum UserType {
        REGULAR
        COP
    }
    
    type Comment {
        id: ID
        description: String
        created: String
        user: User
    }
    type Answer implements Commentable{
        id: ID
        title: String
        description: String
        totalVotes: Int
        created: String
        creator: User
        comments: [Comment]
        accepted: Boolean
    }
    type Tag {
        id: ID
        text: String
    }`;

sequelize.sync().then(() => {
  var resolvers = {
      Commentable: {
          __resolveType: (obj) => {
              if (obj.type) {
                  return "Post";
              }
              return "Answer";
          }
      },
      Query: {
          user(obj, args, context, info) {
            return User.find({ where: {id: args.id} });
          },
          posts: () => {
            return Post.findAll({ include: [{ all: true }]}).then((posts) => {
              posts.forEach(function(post) {
                let user = User.find({ where: {id: post.userId }});
                post.creator = user;
                });
                return posts;
              });
          }, 
          post(obj, args, context, info) {
            return Post.find({ where: {id: args.id}}).then((post) => {
              let user = User.find({ where: {id: post.userId }});
              post.creator = user;
              return post;
            });
          }
      },
      Mutation: {
        createUser(_, { name }) {
          return User.create({
            name: casual.name
          });
        },
        createPost(_, { type, title, userID }) {
          let post = Post.create({
            type: type,
            title: title
          }).then((post) => {
            User.find({where: {id: userID}}).then((user) => {
              post.setUser(user);
            });
          });
        },
        createComment(_, { description, userID, postID, answerID }) {
          let comment = Comment.create({
            description: description
          }).then((comment) => {
            comment.update({
              userId: userID
            });
            if (postID) {
              comment.update({
              postId: postID
            });
            } else {
              comment.update({
              answerId: answerID
            });
            }
          });
        },
        createAnswer(_, {title, description, userID, postID}) {
          Answer.create({
            title: title,
            userId: userID,
            postId: postID,
            description: description
          });
        }
      }
  };

  const server = new GraphQLServer({typeDefs, resolvers});
  server.start();

});
