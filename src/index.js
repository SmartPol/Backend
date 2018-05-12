var express = require('express');
var { GraphQLServer } = require('graphql-yoga');
var { buildSchema } = require('graphql');
var casual = require('casual');

var typeDefs = `
    type Query {
      posts: [Post]
      post(id: ID): Post
      answersByUser(userId: ID): [Answer]
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
        posts: () => {
        return [mockPost(mockUser()),mockPost(mockUser())];
        }, 
        post: (id) => {
            return mockPost(mockUser());
        }
    }
};

const server = new GraphQLServer({typeDefs, resolvers});
server.start();
