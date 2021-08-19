function setAttribute (elem, attr, val, rewrite=false) {
  if (rewrite || ! elem.hasAttribute(attr))
    elem.setAttribute(attr, val);
  else {
      let old_val = elem.getAttribute(attr);
      elem.setAttribute(attr, old_val + ' ' + val);
  }
}

function min (a, b) {
  return a > b ? b : a;
}

class Table {
  constructor(
    parent,    // элемент, в который будет помещена таблица
    attributes, // добавляемые к тегу таблицы атрибуты
    columns,   // информация о колонках, массив объектов вида:
                /*
                { label: "Phone", // название столбца в thead
                  key: "phone",   // уникальное имя столбца
                  hidden: true,   // скрыт ли столбец
                  editable: false // доступен для редактирования
                }
                */
    pagination, // [5, 10, 15] варианты постраничного разбиения,
                // если массив не передан, то все элементы на одной странице
                // по умолчанию используется средний элемент массива
    form_parent // конетйнер, в который будет добавлятся форма редактирования строки
  ) {
    this.parent = parent;
    this.form_parent = form_parent;
    this.id = `tbl-${getRandomInt(2**32)}`;
    this.table = document.createElement('table');

    this._set_attributes(attributes);
    this._parse_columns(columns);

    this.pagination = pagination.sort(function(a,b) {return a - b;}); // сортируем для удобства выбора через select

    this._validate_pagination(); // проверяем корректность массива разбиения
                                 // и устанавливаем значение по умолчанию (средний элемент)
    this._validate_page_number(); // устанавливаем номер текущей страницы на 1
    this._make_label_row();       // создаем thead

    this.rows_count = 0;
    this.rows = [];
  }

  add_row(obj) {
    let keys = [];    // список существующих ключей
    let values = [];  // список соответствующих им значений в добавляемом объекте
    for (let key in this.columns) {
      keys.push(key);
      values.push(obj[key]);
    }
    let row = new Row(this.table, keys, values); // создаем объект строки
    var this_table = this; // чтобы попасть в область видимости
    row.onedit = function() { // если столбец обновился
      if (this_table.sorted_by) // а таблица отсортирована
        this_table.sort_by(this_table.sorted_by, false); // то ее нужно пересортировать, т.к. ключ мог изменится
                                                        // false === NO_REVERSE (не меняем направления сортировки)
      }
    this.rows.push(row); // добавляем его в список строк
    this.rows_count++;
  }

  /*
    Генерирует тело таблицы
  */
  _gen_tbody(){
    var tbody = document.createElement('tbody');
    var keys = this._select_keys(); // выбирает не скрытые столбцы
    var editable_keys = this._editable_keys(); // выбирает доступные для изменения столбцы

    var selected_rows = this.paginate_rows(); // выбирает элементы в соответствии
                                                      //с заданным их количеством на странице
    var this_table = this; // чтобы быть в пространстве видимости callback-функции
    for (let i in selected_rows) {
      selected_rows[i].onclick = function(event) {
        var form = selected_rows[i].editing_form(editable_keys); // при нажатии на строку
        this_table.form_parent.innerHTML = "";
        this_table.form_parent.appendChild(form); // добавляем рядом форму редактирования
      }
      tbody.appendChild(selected_rows[i].to_html(keys)); // добавляем строку в тело таблицы
    }
    return tbody;
  }
  /*
    Возвращает список ключей колонок, доступных для редактирования
  */
  _editable_keys() {
    var keys = [];
    for (let key in this.columns) {
      if (this.columns[key].editable)
            keys.push(key);
    }
    return keys;
  }

 /*
  Добавляет таблицу в элемент-контейнер
 */
  put() {
    this.table.innerHTML = ''; // очищаем таблицу
    var thead = document.createElement('thead');
    var tbody = this._gen_tbody();

    /* Gen thead*/
    thead.appendChild(
      this.thead_row.to_html(
        this._select_keys() // создаем заголовок таблицы из несокрытых колонок
      )
    );

    var table = this;
    thead.onclick = function (event) {
      table.hide_column_button_callback(event); // при нажатии на шестеренку thead::after
                                                      // открывается меню скрыть/показать столбец
    }

    this.table.appendChild(thead);
    this.table.appendChild(tbody);

    this.parent.innerHTML = ''; // очищаем родительский элемент
    this.parent.appendChild(this.table);

    if (this.pagination) // если используется постраничное разбиение
      this.parent.appendChild(this.paginator_html()); // добавляем кнопки управления страницами и разбиением

    this._put_reversed(); // для столбцов отсортированных в обратном порядке добавляем класс "reversed"

    this.onupdate(); // вызываем callback
  }

  /*
    Создает строку подписей (для помещения в thead)
  */
  _make_label_row() {
    let keys = [];
    let labels = [];
    for (let key in this.columns) {
      keys.push(key);
      labels.push(this.columns[key].label);
    }
    this.thead_row = new Row(this.table, keys, labels);
    var tbl = this; // чтобы таблица была видна в callback
    this.thead_row.onclick_td = function(event) {
        var td = event.path.filter(function(elem) {
        return elem.tagName == "TD" // выбираем элемент ячейки подписи столбца
                  && elem.getAttribute("id").includes(`${tbl.thead_row.id}`);
      })[0]; // при нажатии на ячейку с подписью столбца
      tbl.sort_by(td.getAttribute("key")); // таблица сортируется по этому столбцу
    }
  }

/*
  Выбирает ключи не скрытых столбцов
*/
 _select_keys() {
   var keys = [];
   for (let key in this.columns) {
     if (!this.columns[key].hidden)
          keys.push(key);
   }
   return keys;
 }
/*
  Добавляет в столбцы класс "reversed", если они отсортированы в обратном порядке
*/
  _put_reversed() {
    for (let key in this.columns) {
      let td = document.querySelector(`td#${this.thead_row.id}-${key}`);
      if (td && this.columns[key].sorted == -1)
        td.classList.add("reversed");
    }
  }

/*
  При нечетной (по порядку) сортировке по столбцу задает прямой порядок сортировки
  При четной сортировке задает обратный порядок сортировки (reversed)
*/
  _toggle_sort(key) {
    if (this.columns[key].sorted == 1)
      this.columns[key].sorted = -1;
    else if (this.columns[key].sorted == -1)
      this.columns[key].sorted = 1;
    else
      this.columns[key].sorted = 1;

      let td = document.querySelector(`td#${this.thead_row.id}-${key}`);
      td.classList.toggle("reversed");
  }

/*
  Сортирует таблицу по заданному ключу
*/
  sort_by(key, reverse = true) {
      this.sorted_by = key;
      if (reverse) // меняем направление сортировки, если иное не задано
        this._toggle_sort(key);

      var sorted = this.columns[key].sorted; //проверяет используется прямой или обратный порядок сортировки

      var key = key; //?
      if (this.columns[key].sort_func) // если была передана функция сортрровки для столбца
        this.rows = this.rows.sort(this.columns[key].sort_func);
      else
        this.rows = this.rows.sort(function (a, b) {
          return a[key] > b[key] ? 1 : a[key] == b[key] ? 0 : -1;
        });
      if (sorted == -1) this.rows = this.rows.reverse(); // если сортировка обратная, разворачивает массив
      this.put(); // обновляет таблицу
  }

 /*
 Раскрывает описание столбцов таблицы, переданное при инициализации объекта
 */
  _parse_columns(columns) {
    this.columns = {};
    for (let i in columns)
      this.columns[columns[i].key] = {label: columns[i].label,
                                      sort_func: columns[i].sort_func,
                                      hidden: columns[i].hidden ? true : false,
                                      sorted: 0, // 0 - not sorted, 1- sorted, -1 - reversed
                                      editable: columns[i].editable || columns[i].editable === undefined ? true : false
                                    }
  }

/*
  Добавляет пользовательские атрибуты, переданные при инициализации обхекта
*/
  _set_attributes(attributes) {
    for (let attr in attributes)
        setAttribute(this.table, attr, attributes[attr]);
    setAttribute(this.table, "id", this.id);
  }

// проверяет корректность выбранного количества элементов на странице
  _validate_pagination() {
    if (this.pagination.includes(this.per_page)) return; // если такой вариант допустИм
    else
      this.per_page = this.pagination[Math.floor(this.pagination.length / 2)];
          // берет средний элемент (значение по умолчанию)
  }

/*
  Создает селектор, позволяющий выбрать количество элементов на странице
*/
  _page_size_selector_to_html() {
    var select = document.createElement("select");
    setAttribute(select, "id", `select-${this.id}`);
    for (let i in this.pagination) {
      let option = document.createElement("option");
      option.innerText = this.pagination[i]; // выбираетв качестве опции элемент из списка вариантов
      if (this.pagination[i] == this.per_page)
        setAttribute(option, "selected"); // ставим текущий режим выбранным по умолчанию
      select.appendChild(option);
    }
    var this_table = this; // чтобы было видно в callback-е

    select.onchange = function(event) {
        var val = select.value * 1; //str to int
        this_table.per_page = val; // обновляет выбранное значение постраничного отображения
        this_table._validate_pagination(); // проверяет его корректность
        this_table.put(); // обновляет таблицу
    }

    return select;
  }

/*
  Создает навигацию по страницам (кнопки вперед-назад)
*/
  _page_bar_buttons_to_html() {
    var table_obj = this;
    var buttons = [];
    var btns_names = ["to_begin", "back", "next", "to_end"]; // из названий кнопок понятны предназначения
    var btns_values = ["<<", "<", ">", ">>"]; // текст на кнопках
    for (let i = 0; i < 4; i++) {
      var button = document.createElement("input");
      setAttribute(button, "type", "button");
      setAttribute(button, "value", btns_values[i]);
      setAttribute(button, "name", btns_names[i]);
      button.onclick = function(event) { // при нажатии на кнопку
        let button = event.target;
        switch (button.name) {
          case "to_begin":
            table_obj.page = 1; // отображаемая страница -- первая
            break;
          case "back":
            table_obj.page--; // переходим на предыдущую странциу
            break;
          case "next":
            table_obj.page++; // переходим на следующую
            break;
          case "to_end":
            table_obj.page = table_obj._page_count(); // смотрим в конец таблицы
            break;
          }
        table_obj._validate_page_number(); // проверяем существование странциы с таким номером и исправлеям, если нужно
        table_obj.put(); // обновляем таблицу
      };
      buttons.push(button);
    }
    return buttons;
  }

/*
  Создает поле ввода номера страницы (нужно, если листать по одной долго)
*/
  _page_number_input_to_html() {
    var table_obj = this;
    var input = document.createElement("input");
    setAttribute(input, "type", "number");
    setAttribute(input, "min", "1"); // минмиально возомжная страница -- первая
    setAttribute(input, "max", `${this._page_count()}`); // максимально возможная -- последняя
    setAttribute(input, "value", `${this.page}`); // по умолчанию указана текущая
    setAttribute(input, "name", `page`);
    input.onchange = function(event) {
      var value = input.value * 1; // str to int
      table_obj.page = value; // обновляем номер странциы
      table_obj._validate_page_number(); // проверяем его корректность и исправляем при необходимости
      table_obj.put(); // перерисовываем таблицу
    };
    return input;
  }

/*
  Создает навигационный бар по страницам,
   см. два предыдущих метода
*/
  _page_manager_to_html() {
    var bar = document.createElement("div");
    setAttribute(bar, "id", `bar-${this.id}`);

    var buttons = this._page_bar_buttons_to_html();
    var input = this._page_number_input_to_html();

    bar.appendChild(buttons[0]);
    bar.appendChild(buttons[1]);
    bar.appendChild(input); // порядок выбран с эстетической целью: <<  <  [ ]  >  >>
    bar.appendChild(buttons[2]);
    bar.appendChild(buttons[3]);

    return bar;
  }

/*
  Создает пользовательскую панель управления постраничным отображением
     (количество элементов на странцие, кнопки переключения страниц, поле ввода номера страницы)
*/
  paginator_html() {

    var select = this._page_size_selector_to_html(); // выбор кол-ва элементов на странице
    var bar = this._page_manager_to_html(); // кнопки навигации по страницам

    var paginator_container = document.createElement("div");
    setAttribute(paginator_container, "class", "paginator")

    var label = document.createElement("label");
    setAttribute(label, "for", `select-${this.id}`);
    label.innerText = `Elements per page: `;

    paginator_container.appendChild(label);

    paginator_container.appendChild(select);
    paginator_container.appendChild(bar);

    return paginator_container;
  }
// вычисляет количество страниц, занмимаемых при текущих настройках
  _page_count() {
    return Math.ceil(this.rows_count / this.per_page);
  }

// проверяет корректность номера страницы и исправляет при необходимости
  _validate_page_number() {
    var pages = this._page_count();
    if (!this.page) this.page = 1;
    if (this.page > pages)
      this.page = pages; // last page
    if (this.page <= 0)
      this.page = 1; // first page
  }

/*
 Выбирает столбцы в соответствии с ннастройкой постраничного отображения
*/
  paginate_rows() {
    this._validate_page_number();
    if (this.pagination) { // если постраничное отображение используется
      var begin_row = (this.page - 1) * this.per_page; // начало выборки в соответствии с номером страницы
      var end_row = begin_row + this.per_page; // конец выборки
    }
    else { // если нет постраничного отображения
      var begin_row = 0; // начинаем с первой строки
      var end_row = rows_count; // и выводим до конца
    }
    var paginated_rows = [];
    for (var i = begin_row; i < min(end_row, this.rows_count); i++)
      paginated_rows.push(this.rows[i]); // добавляем строку в список выбранных
    return paginated_rows;
  }

/*
  Скрывает/показывает столбец
*/
  toggle_column(key) {
    this.columns[key].hidden = !this.columns[key].hidden;
    this.put();
  }

/*
    При нажатии кнопки выбора столбца для скрытия/показа
        проверяет, что нажатие произошло на thead::after
*/
  hide_column_button_callback(event) {
    if (event.path[0].tagName == "THEAD") {
      this.beforehidecolumn(); // выполняет callback-обязательство
      this.hide_column_container.innerHTML= ''; // очищает место для формы
      this.hide_column_container.appendChild(
        this._hide_column_form_to_html() // добавляет форму выбора скрываемого/показываемого столбца
      );
    }
  }

/*
  Генерирует форму выбора скрываемого/показываемого столбца
*/
  _hide_column_form_to_html() {
    var form = document.createElement("div");
    setAttribute(form, "class", "hideform");
    setAttribute(form, "id", `hideform-${this.id}`);

    var label = this._hide_column_select_label();
    var selector_and_button = this._hide_column_selector();

    form.appendChild(label);
    form.appendChild(selector_and_button[0]);
    form.appendChild(selector_and_button[1]);
    return form;
  }

_too_many_columns_hidden() {
  var unhidden_columns_count = 0;
  for (var key in this.columns)
    if (!this.columns[key].hidden) unhidden_columns_count++;

  if (unhidden_columns_count > 1) return false;
  else return true; // можем скрывать до того момета, как останется одна колонка
  // иначе таблица пуста и нам нечего показывать
}

  _hide_column_selector() {
    var selector = document.createElement("select");
    var button = document.createElement("input");

    setAttribute(button, "type", "button");
    var this_table = this;
    button.onclick = function() {
      this_table.toggle_column(selector.value);
      background.click();
    };


    setAttribute(selector, "id", "hide-selector");
    for (let i in this_table.columns) {
      let option = document.createElement("option");
      setAttribute(option, "value", i);
      option.innerText = this_table.columns[i].label;
      selector.appendChild(option);
    }
    selector.onchange = function() {
      if (this_table._too_many_columns_hidden() // слишком много столбцов спрятано (остался один)
          && this_table.columns[this.value].hidden == false) { //и этот последний столбец пытаются спрятать
        button.disabled = true; // не даем такую возможность
        button.value = "Too many columns are hidden"; // извиняемся
        return;
      }
      if (this_table.columns[this.value].hidden == true)
        button.value = "Show";
      else
        button.value = "Hide";
      button.disabled = false; // разблокируем кнопку, если можно совершать операцию
    };
    selector.onchange(selector);

    return [selector, button];
  }

  _hide_column_select_label() {
    var label = document.createElement('label');
    setAttribute(label, "for", `${this.id}-hide-selector`);
    label.innerText = "Select column name: ";
    return label;
  }

  beforehidecolumn = function(){};
  hide_column_container = null;
}

class Row {
  constructor(table, // тэг таблицы, в который будет добавлена строка
              keys,  // уникальные имена полей
              values // значения полей
              ) {
    this.table = table;
    this.id = 'row-' + getRandomInt(2**32);
    this.keys = keys;
    this.values = values;
    this._parse_values();
  }

  _parse_values() {
    for (let i in this.keys)
      this[this.keys[i]] = this.values[i];
  }

  set(key, value, update=true) {
    this.add_column(key, value);
    if (update) this.update();
  }

  update() {
    for (var i in this.keys) { // проходим по всем ячейкам строки
      let td = document.getElementById(`${this.id}-${this.keys[i]}`);
      if (td)
        td.innerHTML = `<p>${this[this.keys[i]]}</p>`; // ставим обнолвенные значения
    }
    this.onupdate();
  }

  update_value(key, value) {
    this.values[this.keys.indexOf(key)] = value; // изменяем значение в списке значений
    this[key] = value; // изменяем значение по ключу
    this.update(); // обновляем уже отрисованную таблицу
  }

  has_key(key) {
    return this.keys.includes(key);
  }

  /*
    Вставляет пару ключ-значение в списки значений
    и добавляет значение по ключу
  */
  _insert_value(key, value, after=false) {
    var after_ind = this.keys.indexOf(after);
    this.keys.splice(after_ind + 1, 0, key);
    this.values.splice(after_ind + 1, 0, value);
    this[key] = value;
  }

  /*
    Добавляет новое поле (колонку)
    после элемента с ключем $after
  */
  add_column(key, value, after=false) {
    if (this.has_key(key))
      return this.update_value(key, value);
    this._insert_value(key, value, after);
  }

  /*
    Генерирует HTML элемент строки
  */

  to_html(keys) {
    var tr = document.createElement("tr");
    setAttribute(tr, "id", this.id);
    setAttribute(tr, "class", this.table.id);

    var selected_keys = this.keys;  // по умолчанию добавляются все поля (колонки)
    if (keys) selected_keys = keys; // если передан список полей, то заполняет по списку


    for (let i in selected_keys) {
      let td = document.createElement("td");
      setAttribute(td, "id", `${this.id}-${selected_keys[i]}`); // уникальный id
      setAttribute(td, "key", `${selected_keys[i]}`); // при наличии ключа в явном виде проще работать со строкой
      td.innerHTML = `<p>${this[selected_keys[i]]}</p>`; // значение поля
      td.onclick = this.onclick_td; // подвязываем callback ячейки
      tr.appendChild(td); // добавляем ячейку в строку
    }

    tr.onclick = this.onclick; // подвязываем callback строки
    return tr;
  }

  /*
    Генерирует форму редактирования строки
  */
  editing_form(keys) {
    var form = document.getElementById(`edit-${this.id}`);
    if (form) form.remove();  // если уже есть форма, то ее удаляем

    form = document.createElement('form');
    setAttribute(form, "id", `edit-${this.id}`); //уникальный id формы

    if (!keys) keys = this.keys; // если не передан список ключей, то используем все

    for (let i in keys) {
      let inp = document.createElement('input'); // для кажого из полей создает input
      setAttribute(inp, 'type', 'text');
      setAttribute(inp, 'name', keys[i]); // когда name=key удобно обращаться из внешнего js
      setAttribute(inp, 'class', `edit-${this.id}`);
      setAttribute(inp, 'palceholder', `Enter ${keys[i]}`);
      setAttribute(inp, 'value', this[keys[i]] ? this[keys[i]] : '');
      form.appendChild(inp);
    }
    let sbmt = document.createElement('input'); // конпка сохранения формы
    setAttribute(sbmt, 'type', 'button');
    setAttribute(sbmt, 'value', 'Save');
    setAttribute(sbmt, 'row-id', `${this.id}`);

    var this_row = this; // чтобы попасть в видимость функции ниже
    sbmt.onclick = function() {
      var form = document.getElementById(`edit-${this_row.id}`); // форма редактирования
      var inputs = document.getElementsByClassName(`edit-${this_row.id}`); // inputы полей
      for (let i = 0; i < inputs.length; i++) {
        this_row.set(inputs[i].name, inputs[i].value, true); // обновляем значениями из формы
      }
      form.remove(); // убираем форму, т.к. сохранили её
      this_row.onedit(); //чтобы сохранилась сортировка в случае чего
    }
    form.appendChild(sbmt);
    return form;
  }

  onclick_td = function(){};
  onclick = function(){};
  onupdate = function(){};
  onedit = function(){};
}
