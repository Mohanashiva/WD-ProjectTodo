"use strict";
const { Op } = require("sequelize");
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
      // define association here
    }
    static getTodos() {
      return this.findAll();
    }
    static async overdue(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          userId,
          completed: false,
        },

        order: [["id", "ASC"]],
      });
    }
    static async dueToday(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          userId,
          completed: false,
        },

        order: [["id", "ASC"]],
      });
    }

    static async remove(id, userId) {
      return this.destroy({
        where: {
          userId,
          id,
        },
      });
    }
    static async dueLater(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          userId,
          completed: false,
        },

        order: [["id", "ASC"]],
      });
    }

    static async completedTodos(userId) {
      return await Todo.findAll({
        where: {
          userId,
          completed: true,
        },
        order: [["id", "ASC"]],
      });
    }
    setCompletionStatus(todoStatus) {
      return this.update({ completed: todoStatus });
    }
    static addTodo({ title, dueDate, userId }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userId,
      });
    }
  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
