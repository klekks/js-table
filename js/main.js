function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

window.onload = function () {
  window.onresize = function() { // призываем смотреть на большом экране
    if (window.innerWidth < 1430) // чтобы разметка не поплыла
    console.log("Width of your screen is too small.");
  }
  if (window.innerWidth < 1430)
    alert("Width of your screen is too small.");

  if (!/Chrome/.test(navigator.userAgent))
    alert("Your browser may be not supported"); // заботимся о красоте сайта, ибо
                                            // не весь css общеупотребим

  tbl_parent = document.getElementById("table-container"); // контейнер для таблицы
  form_parent = document.getElementById("form-container"); // контейнер формы редактирования

  var hide_selector_background = document.createElement("div"); // контейнер для формы
  setAttribute(hide_selector_background, "id", "background");   // скрытия/показа столбцов таблицы
  hide_selector_background.onclick = function(event) {
    if (event.path[0].tagName == "DIV") this.remove(); // при нажатии в "пустоту" закрыть форму
  };

  var tbl = new Table(tbl_parent, // создаем класс таблицы, первый аргумент - родительский элемент
                  {
                    "class": "table" // просим добавить к таблице атрибут "class"
                    // можно передать любые атрибуты, если потербуется (кроме id)
                  },
                  [ // передаем список столбцов.
                    {label: "First Name", key: "firstName"}, // label - подпись столбца в thead
                    {label: "Last Name", key: "lastName"},   // key - уникальное  имя столбца,
                    {label: "About", key: "about"},          // по которому его можно найти/выбрать
                    {label: "Eye Colour", key: "eyeColor"},
                    {label: "Phone", key: "phone",
                          hidden: true, editable: false} // если добавить hidden: true,
                                                         // то соответствующая колонка будет скрыта
                                                         // (с возможностью показать)
                  ],

                  [5, 7, 10, 15, 25, 30, 50], // варианты постраничного разбиения
                  // если не указаны, то все элементы будут на одной странице,
                  // по умолчанию берется средний элемент списка
                  form_parent // родительский элемент формы редактирования
                );

  tbl.hide_column_container = hide_selector_background; // добавляем в таблицу контейнер формы сокрытия столбцов
  tbl.beforehidecolumn = function () { // перед показом формы
    var body = document.getElementsByTagName("body")[0];
    body.appendChild(hide_selector_background); // добавляем ее контейнер в тело страницы
  };


  tbl.onupdate = show_colors;

  for (i in data) // в цикле добавляем строки с данными
    tbl.add_row(  // В СООТВЕТСТВИИ С ПЕРЕДАННЫМИ key (-s)
      { firstName: data[i].name.firstName,
        lastName: data[i].name.lastName,
        about: data[i].about,
        eyeColor: data[i].eyeColor,
        phone: data[i].phone // как пример скрытого поля  (сверх ТЗ)
      });

  tbl.put(); // выводим таблицу
}

function show_colors() { // после каждого обновления таблицы
    let colors = document.querySelectorAll('tbody td[key="eyeColor"]'); // делаем текст столбца "eyeColor"
    colors.forEach(function(a) {a.setAttribute("style", `color: ${a.innerText};`)}); // css стилем
}
