const countColor = document.getElementById("count-color");
const countButton = document.getElementById("count-button");
const countResult = document.getElementById("count-result");
const allColorsResult = document.getElementById("all-colors-result");

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

// Барлық боялған ұяшықтарды санаймыз.
function countAllColors() {
  const cells = document.querySelectorAll("#table td");
  const counts = { red: 0, green: 0, blue: 0, yellow: 0 };
  const colorNames = { red: "қызыл", green: "жасыл", blue: "көк", yellow: "сары" };
  const results = [];

  for (const cell of cells) {
    const color = cell.dataset.color;
    if (counts[color] !== undefined) {
      counts[color]++;
    }
  }

  for (const color in counts) {
    if (counts[color] > 0) {
      results.push(counts[color] + " " + colorNames[color]);
    }
  }

  if (results.length === 0) {
    allColorsResult.textContent = "Боялған ұяшықтар жоқ.";
  } else {
    allColorsResult.textContent = "Барлық түстер: " + results.join(", ");
  }
}

document.getElementById("table").addEventListener("click", countAllColors);
countAllColors();
