// Test script for creating a todolist overlay
// Open the browser console and paste this code to test

import { createOverlayWithCurrentUsername } from "./utils/createOverlay";

async function testCreateTodoList() {
  const todoListData = {
    type: "todolist",
    style: {
      width: 450,
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "16px"
    },
    title: "Tasks for Today",
    tasks: [
      {
        id: "task1",
        text: "Kiss Marina",
        completed: false,
        priority: "high",
        tags: ["personal", "important"]
      },
      {
        id: "task2",
        text: "Hug Marina",
        completed: false,
        priority: "high",
        tags: ["personal", "important"]
      }
    ],
    showCompleted: true,
    allowAddTask: true,
    allowDeleteTask: true,
    url: window.location.href
  };

  try {
    const result = await createOverlayWithCurrentUsername("TodoList", todoListData);
    console.log("Todo list creation result:", result);
    return result !== null;
  } catch (error) {
    console.error("Error creating todo list:", error);
    return false;
  }
}

// Call the function
testCreateTodoList().then(success => {
  console.log("Todo list creation " + (success ? "succeeded" : "failed"));
});

// Alternatively, use this in the browser console directly
/*
(async function() {
  const todoListData = {
    type: "todolist",
    style: {
      width: 450,
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "16px",
      top: 100,
      left: 100
    },
    title: "Tasks for Today",
    tasks: [
      {
        id: "task1",
        text: "Kiss Marina",
        completed: false,
        priority: "high",
        tags: ["personal", "important"]
      },
      {
        id: "task2",
        text: "Hug Marina",
        completed: false,
        priority: "high",
        tags: ["personal", "important"]
      }
    ],
    showCompleted: true,
    allowAddTask: true,
    allowDeleteTask: true,
    url: window.location.href
  };

  await window.createTodoListOverlay(todoListData);
})();
*/ 