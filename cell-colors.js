const colorTable = document.getElementById("table");
const cellColors = ["red", "green", "blue", "yellow"];

colorTable.addEventListener("click", function (event) {
  const cell = event.target.closest("td");

  if (!cell || !colorTable.contains(cell)) {
    return;
  }

  const currentIndex = cellColors.indexOf(cell.dataset.color);
  const nextIndex = (currentIndex + 1) % cellColors.length;
  const nextColor = cellColors[nextIndex];

  cell.style.backgroundColor = nextColor;
  cell.dataset.color = nextColor;
});