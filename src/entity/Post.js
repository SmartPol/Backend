module.exports = {
    name: "Post",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true
        },
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        totalVotes: {
          type: "int"
        },
        created: {
          type: "string"
        },
        insideOnly: {
          type: "boolean"
        },
        type: {
          type: "enum"
        }
        // casual.boolean ? "QUESTION" : "ARTICLE",
        ///creator
      //  comments: [mockComment({id: id}, user)],
      //  answers: [mockAnswer(user)],
       // tags: [mockTag(), mockTag()]
    }
};