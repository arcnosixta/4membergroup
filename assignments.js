// Элементті ID бойынша тауып, мәтінін өзгертеміз.
const greeting = document.getElementById('greeting');
greeting.textContent = 'Сәлем, әлем!';

// Жаңа div жасап, body соңына қосамыз.
const newDiv = document.createElement('div');
newDiv.className = 'new-div';
newDiv.textContent = 'Мен жаңа элементпін';
newDiv.hidden = true;
document.body.appendChild(newDiv);

// Ескі элементті класы бойынша тауып, жоямыз.
document.querySelector('.old-element').remove();

// Басуға болатын жаңа абзац жасаймыз.
const paragraph = document.createElement('p');
paragraph.id = 'change-paragraph';
paragraph.textContent = 'Бұл ауыспалы абзац';
paragraph.tabIndex = 0;
paragraph.setAttribute('role', 'button');
document.getElementById('paragraph-container').appendChild(paragraph);

// Абзацты басқанда мәтіннің түсі мен өлшемін өзгертеміз.
paragraph.onclick = function () {
  paragraph.style.color = '#e64b4b';
  paragraph.style.fontSize = '24px';
};

// Enter немесе бос орын пернесімен де басуға болады.
paragraph.onkeydown = function (event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    paragraph.click();
  }
};

// Қажетті элементтерді табамыз.
const classElement = document.getElementById('class-element');
const toggleClassButton = document.getElementById('toggle-class');
const classListText = document.getElementById('class-list');

// Барлық кластарды консольге және абзацқа шығарамыз.
function showClasses() {
  console.log(classElement.className);
  classListText.textContent = 'Кластар: ' + classElement.className;
}

toggleClassButton.addEventListener('click', function () {
  // Класс бар болса жоямыз, жоқ болса қосамыз.
  classElement.classList.toggle('active');
  showClasses();
});

showClasses();

// 3-тапсырма: кесте құру.
    // Функция заполняет таблицу указанным количеством строк и столбцов.
    function createTable(rows, columns) {
      const table = document.getElementById("table");
      table.innerHTML = ""; // Удаляем предыдущие строки.
      document.getElementById("count-result").textContent =
        "Выберите цвет и нажмите «Подсчитать».";

      for (let i = 0; i < rows; i++) {
        const row = table.insertRow(); // Создаём строку.

        for (let j = 0; j < columns; j++) {
          row.insertCell(); // Добавляем ячейку в эту строку.
        }
      }

      document.getElementById("message").textContent =
        "Создана таблица: " + rows + " × " + columns;
    }

    // Браузер проверяет ограничения полей перед отправкой формы.
    document.getElementById("table-form").addEventListener("submit", function (event) {
      event.preventDefault(); // Не даём странице перезагрузиться.
      const rows = Number(document.getElementById("rows").value);
      const columns = Number(document.getElementById("columns").value);
      createTable(rows, columns);
    });

// Бұрынғы кесте сілтемесінен келгенде 3–4 тапсырманы ашамыз.
tabs.forEach(function (tab) {
  if ('#' + tab.dataset.tab === window.location.hash) {
    tab.click();
  }
});
