var express = require('express');
var { GraphQLServer } = require('graphql-yoga');
var { buildSchema } = require('graphql');
var casual = require('casual');
var uuid = require('uuid/v4');
var { createConnection, EntitySchema } = require('typeorm');
const Sequelize = require('sequelize');
const sequelize = new Sequelize('smart-pol', 'root', '', {
  host: 'localhost',
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
   title: Sequelize.STRING
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
function mockUser() {
   return {
    id: casual.integer(from = 1, to = 100),
    name: casual.name,
    image: "https://orig00.deviantart.net/b94b/f/2015/230/0/4/google_default_profile_picture_by_mircrosoft18-d967dkr.jpg",
    points: casual.integer(from = -100, to = 100),
    created: casual._unix_time,
    type: casual.boolean ? "REGULAR" : "COP"
   };
}

function mockComment(parent, user) {
    return {
    id: casual.integer(from = 1, to = 100),
    description: casual.description,
    created: casual._unix_time,
    user: user,
    parent: parent
   };
}
function mockAnswer(user) {
    var id = casual.integer(from = 1, to = 100);
    return {
        id: id,
        title: casual.title,
        description: casual.description,
        totalVotes: casual.integer(from = -100, to = 100),
        created: casual._unix_time,
        creator: user,
        comments: mockComment({id: id}, user),
        accepted: casual.boolean
    };
}
function mockTag() {
    return {
        id: casual.integer(from = 1, to = 100),
        text: casual.word                   
    };
}

function mockPost(user) {
    var id = casual.integer(from = 1, to = 100);
    return {
        id: id,
        title: casual.title,
        description: casual.description,
        totalVotes: casual.integer(from = -100, to = 100),
        creator: user,
        created: casual._unix_time,
        insideOnly: casual.boolean,
        type: casual.boolean ? "QUESTION" : "ARTICLE",
        comments: [mockComment({id: id}, user)],
        answers: [mockAnswer(user)],
        tags: [mockTag(), mockTag()]
    };
}


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
            console.log(args.id);
            return User.find({ where: {id: args.id} });
          },
          posts: () => {
            return Post.findAll({ include: [{ all: true }]});
          }, 
          post(obj, args, context, info) {
              return Post.find({ where: {id: args.id}}).then((post) => {
                let user = User.find({ where: {id: post.userId }});
                
                post.creator = user;
                console.log(post);
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
              console.log(user);
              post.setUser(user);
            });
          });
        } 
      }
  };

  const server = new GraphQLServer({typeDefs, resolvers});
  server.start();

});
