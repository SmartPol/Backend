var express = require('express');
var { GraphQLServer } = require('graphql-yoga');
var { buildSchema } = require('graphql');
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
    accepted: Sequelize.BOOLEAN
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
    insideOnly: Sequelize.BOOLEAN,
    type: Sequelize.ENUM('QUESTION', 'ARTICLE')
});

Post.hasMany(Tag);
Post.hasMany(Comment);
Post.hasMany(Answer);
Post.belongsTo(User);

User.hasMany(Comment);
User.hasMany(Answer);

Answer.hasMany(Comment);

var typeDefs = `
    type Query {
      clearDB(test:Boolean): Boolean
      posts: [Post]
      post(id: ID): Post
      user(id: ID): User
      answersByUser(userId: ID): [Answer]
    }
    type Mutation {
     
      createUser(name: String, description: String, headLine: String, image: String, points: Int, type: UserType): User 
      createPost(title: String, description: String, totalVotes: Int, insideOnly: Boolean, type: PostType, userId: ID): Post
      createComment(description: String, postId: ID, userId: ID, answerId: ID): Comment
      createAnswer(title: String, description: String, totalVotes: Int, accepted: Boolean, postId: ID, userId: ID): Answer
      createTag(text: String, postId: ID): Tag
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
        type: UserType
    }
     enum UserType {
        REGULAR
        COP
    }
    
    type Comment {
        id: ID
        description: String
        creator: User
    }
    type Answer implements Commentable{
        id: ID
        title: String
        description: String
        totalVotes: Int
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
          clearDB: (drop) => {
            sequelize.drop();
          },
          
          user(obj, args, context, info) {
            return User.find({ where: {id: args.id} });
          },
          posts: () => {
            return Post.findAll({ include: [{ all: true }]}).then((posts) => {
              posts.forEach(function(post) {
                  post.creator = User.find({ where: {id: post.userId }});
                  post.answers = Answer.findAll({ where: {postId: post.id, }});
                  post.comments = Comment.findAll({ where: {postId: post.id }});
                  post.tags = Tag.findAll({ where: {postId: post.id }});
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
        createUser(_, { name, description, headLine, image, points, type}) {
          return User.create({
            name: name || "",
            description: description || "",
            headLine:headLine || "",
            image: image || "",
            points: points || 0,
            type: type
          });
        },
        createPost(_, { title, description, totalVotes, insideOnly, type, userId }) {
          let post = Post.create({
            title: title,
            description: description,
            totalVotes: totalVotes,
            insideOnly: insideOnly,
            type: type,
            userId: userId
          });
        },
        createComment(_, { description, postId, userId, answerId}) {
          Comment.create({
            description: description,
            postId: postId,
            userId: userId,
            answerId: answerId
          });
        },
        createAnswer(_, {title, description, totalVotes, accepted, postId, userId}) {
          Answer.create({
            title: title,
            description: description,
            totalVotes: totalVotes,
            accepted: !!accepted,
            postId: postId,
            userId: userId
          });
        },
        createTag(_, {text, postId}) {
           Tag.create({
            text: text,
            postId: postId
          });
        }
      }
  };

  const server = new GraphQLServer({typeDefs, resolvers});
  server.start();

});
