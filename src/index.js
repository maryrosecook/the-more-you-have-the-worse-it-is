let game;
document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "complete") {
    game = new Game("screen", 600, 600);
  }
});
