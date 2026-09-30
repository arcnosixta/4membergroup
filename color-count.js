const countColor = document.getElementById("count-color");
const countButton = document.getElementById("count-button");
const countResult = document.getElementById("count-result");

countButton.addEventListener("click", function () {
  const cells = document.querySelectorAll("#table td");
  let count = 0;

  // Считаем ячейки, цвет которых совпадает с выбранным.
  for (const cell of cells) {
    if (cell.dataset.color === countColor.value) {
      count++;
    }
  }

  countResult.textContent = "Количество ячеек: " + count;
});
