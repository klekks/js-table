var patterns = {
  table: `<table id=""><thead><tr></tr></thead><tbody></tbody></table>`,
  td: `<td><p>innertext</p></td>`,
  tr: `<tr>innertext</tr>`,
}

function setAttribute (elem, attr, val, rewrite=false) {
  if (rewrite || ! elem.hasAttribute(attr))
    elem.setAttribute(attr, val);
  else {
      let old_val = elem.getAttribute(attr);
      elem.setAttribute(attr, old_val + ' ' + val);
  }
}

class Table {
  constructor(
    parent_element, // элемент, в который будет добавлена таблица
    attributes,     // словарь из добавляемых к тэгу таблицы атрибутов (в т.ч. class, id)
    columns_number,
    labels,         // массив подписей к столбцам
    keys,           // массив имен атрибутов объекта строки таблицы
    elements_per_page,
    sort_functions, // массив функцийсортировки для конкретных столбцов
  ) {
    this.id = 'tbl-' + getRandomInt(2**32);
    this.parent = parent_element;
    this.elements_per_page = elements_per_page;
    this.attributes = attributes;
    this.columns = [];
    this.rows = [];
    for (var i = 0; i < columns_number; i++) {
      this.columns.push({label: labels[i],
                         key: keys[i],
                         hidden: false,
                         sort_func: sort_functions[i]
                       });
    }
  }

  add_row(row_object) {
    this.rows.push(row_object);
  }
  sort_by(key, reversed=false) {
    this.rows.sort(function(a, b) {return a[key] > b[key];})
    if (reversed) this.rows.revers();
  }
  show() {
    this.parent.innerHTML += patterns.table.replace('id=""', `id="${this.id}"`);
    this.self = document.getElementById(this.id);
    for (var attr in this.attributes)
        setAttribute(this.self, attr, this.attributes[attr]);

    this.thead = document.querySelector(`table[id*="${this.id}"] thead`);
    this.header = this.thead.children[0];
    this.tbody = document.querySelector(`table[id*="${this.id}"] tbody`);

    for (var column in this.columns) {
      this.header.innerHTML += patterns.td.replace('innertext', this.columns[column].label);
    }

    for (var row in this.rows) {
      var tds = '';
      for (var i in this.columns) {
        if (!this.columns[i].hidden)
          tds += patterns.td.replace('innertext', this.rows[row][this.columns[i].key]);
      }
      this.tbody.innerHTML += patterns.tr.replace('innertext', tds);
    }
  }

  update() {
    this.self.remove();
    this.show();
  }
}
