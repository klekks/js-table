var tmp;
function setAttribute (elem, attr, val, rewrite=false) {
  if (rewrite || ! elem.hasAttribute(attr))
    elem.setAttribute(attr, val);
  else {
      let old_val = elem.getAttribute(attr);
      elem.setAttribute(attr, old_val + ' ' + val);
  }
}

var editing_rows = {};

class Row {
  constructor(table,
              keys,
              values
              ) {
    this.table = table; // Table object
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
    for (var i in this.keys) {
      let td = document.getElementById(`${this.id}-${this.keys[i]}`);
      if (td)
        td.innerHTML = `<p>${this[this.keys[i]]}</p>`;
    }
    this.onupdate();
  }

  update_value(key, value) {
    this.values[this.keys.indexOf(key)] = value;
    this[key] = value;
  }

  has_key(key) {
    return this.keys.includes(key);
  }

  _insert_value(key, value, after=false) {
    var after_ind = this.keys.indexOf(after);
    this.keys.splice(after_ind + 1, 0, key);
    this.values.splice(after_ind + 1, 0, value);
    this[key] = value;
  }

  add_column(key, value, after=false) {
    if (this.has_key(key))
      return this.update_value(key, value);
    this._insert_value(key, value, after);
  }

  to_html(keys) {
    if (document.getElementById(this.id))
        document.getElementById(this.id).remove();
    var tr = document.createElement("tr");
    setAttribute(tr, "id", this.id);
    setAttribute(tr, "class", this.table.id);

    var selected_keys = this.keys;
    if (keys) selected_keys = keys;


    for (let i in selected_keys) {
      let td = document.createElement("td");
      setAttribute(td, "id", `${this.id}-${selected_keys[i]}`);
      setAttribute(td, "key", `${selected_keys[i]}`);
      td.innerHTML = `<p>${this[selected_keys[i]]}</p>`;
      td.onclick = this.onclick_td;
      tr.appendChild(td);
    }

    tr.onclick = this.onclick;
    return tr;
  }

  editing_form(keys) {
    var form = document.getElementById(`edit-${this.id}`);
    if (form) form.remove();  // если уже есть форма, то ее удаляем

    form = document.createElement('form');
    setAttribute(form, "id", `edit-${this.id}`);
    if (!keys) keys = this.keys;

    for (let i in keys) {
      let inp = document.createElement('input');
      setAttribute(inp, 'type', 'text');
      setAttribute(inp, 'name', keys[i]);
      setAttribute(inp, 'class', `edit-${this.id}`);
      setAttribute(inp, 'palceholder', `Enter ${keys[i]}`);
      setAttribute(inp, 'value', this[keys[i]] ? this[keys[i]] : '');
      form.appendChild(inp);
    }
    let sbmt = document.createElement('input');
    setAttribute(sbmt, 'type', 'button');
    setAttribute(sbmt, 'value', 'Save');
    setAttribute(sbmt, 'row-id', `${this.id}`);

    sbmt.onclick = this.on_form_save; // todo
    form.appendChild(sbmt);

    editing_rows[this.id] = this;

    return form;
  }

  on_form_save(a) {
    var row = editing_rows[this.getAttribute("row-id")];
    tmp = row;
    var form = document.getElementById(`edit-${row.id}`);
    var inputs = document.getElementsByClassName(`edit-${row.id}`);
    for (let i = 0; i < inputs.length; i++) {
      row.set(inputs[i].name, inputs[i].value, true);
    }
    form.remove();
  }

  onclick_td = function(){};
  onclick = function(){};
  onupdate = function(){};
}

class Table {
  constructor(
    parent,    // Node
    attributes, // {"class": "class_name", "name": "why?"}
    columns,   // [{label: "", sort_func: function () {}, key: "", hidden: false}, ...]
    pagination, // [5, 10, 15] (elements per page, if no pagination skip this)
    form_parent // Node
  ) {
    this.parent = parent;
    this.form_parent = form_parent;
    this.id = `tbl-${getRandomInt(2**32)}`;
    this.table = document.createElement('table');

    this._set_attributes(attributes);
    this._parse_columns(columns);

    this.pagination = pagination.sort(function(a,b) {return a - b;});

    this._validate_pagination();
    this._validate_page_number();
    this._make_label_row();

    this.rows_count = 0;
    this.rows = [];
  }

  add_row(obj) {
    let keys = [];
    let values = []
    for (let key in this.columns) {
      keys.push(key);
      values.push(obj[key]);
    }
    let row = new Row(this.table, keys, values);
    this.rows.push(row);
    this.rows_count++;
  }

  _gen_tbody(){
    var tbody = document.createElement('tbody');
    var keys = this._select_keys();

    var selected_rows = this.paginate_rows();
    var this_ = this;
    for (let i in selected_rows) {
      selected_rows[i].onclick = function(event) {
        console.log(i);
        var form = selected_rows[i].editing_form();
        this_.form_parent.innerHTML = "";
        this_.form_parent.appendChild(form);
      }
      tbody.appendChild(selected_rows[i].to_html(keys));
    }
    return tbody;
  }

  put() {
    this.table.innerHTML = '';
    var thead = document.createElement('thead');
    var tbody = this._gen_tbody();

    /* Gen thead*/
    thead.appendChild(
      this.thead_row.to_html(
        this._select_keys()
      )
    );

    /* Gen tbody */


    this.table.appendChild(thead);
    this.table.appendChild(tbody);

    this.parent.innerHTML = '';
    this.parent.appendChild(this.table);

    if (this.pagination)
      this.parent.appendChild(this.paginator_html());

    this._put_reversed();
  }

  _make_label_row() {
    let keys = [];
    let labels = []
    for (let key in this.columns) {
      keys.push(key);
      labels.push(this.columns[key].label);
    }
    this.thead_row = new Row(this.table, keys, labels);
    var tbl = this;
    this.thead_row.onclick_td = function(event) {
      var td = event.path.filter(function(elem) {
        return elem.tagName == "TD"
                  && elem.getAttribute("id").includes(`${tbl.thead_row.id}`);
      })[0];
      tmp = td;
      tbl.sort_by(td.getAttribute("key"));
    }
  }

 _select_keys() {
   var keys = [];
   for (let key in this.columns) {
     if (!this.columns[key].hidden)
          keys.push(key);
   }
   return keys;
 }

  _put_reversed() {
    for (let key in this.columns) {
      let td = document.querySelector(`td#${this.thead_row.id}-${key}`);
      if (td && this.columns[key].sorted == -1)
        td.classList.add("reversed");
    }
  }

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

  sort_by(key) {
      this._toggle_sort(key);

      var sorted = this.columns[key].sorted;

      var key = key;
      this.rows = this.rows.sort(function(a, b) {
        return a[key] > b[key] ? 1 : a[key] == b[key] ? 0 : -1;
      });
      if (sorted == -1) this.rows = this.rows.reverse();
      this.put();
  }

  _parse_columns(columns) {
    this.columns = {};
    for (let i in columns)
      this.columns[columns[i].key] = {label: columns[i].label,
                                      sort_func: columns[i].sort_func,
                                      hidden: columns[i].hidden ? true : false,
                                      sorted: 0 // 0 - not sorted, 1- sorted, -1 - reversed
                                    }
  }

  _set_attributes(attributes) {
    for (let attr in attributes)
        setAttribute(this.table, attr, attributes[attr]);
    setAttribute(this.table, "id", this.id);
  }

  _validate_pagination() {
    if (this.pagination.includes(this.per_page)) return;
    else
      this.per_page = this.pagination[Math.floor(this.pagination.length / 2)];
          // берет средний элемент по умолчанию
  }

  _page_size_selector_to_html() {
    var select = document.createElement("select");
    setAttribute(select, "id", `select-${this.id}`);
    for (let i in this.pagination) {
      let option = document.createElement("option");
      option.innerText = this.pagination[i];
      if (this.pagination[i] == this.per_page)
        setAttribute(option, "selected");
      select.appendChild(option);
    }
    var this_tbl = this;

    select.onchange = function(event) {
        var val = select.value * 1; //str to int
        this_tbl.per_page = val;
        this_tbl._validate_pagination();
        this_tbl.put();
    }

    return select;
  }

  _page_bar_buttons_to_html() {
    var table_obj = this;
    var buttons = [];
    var btns_names = ["to_begin", "back", "next", "to_end"];
    var btns_values = ["<<", "<", ">", ">>"];
    for (let i = 0; i < 4; i++) {
      var button = document.createElement("input");
      setAttribute(button, "type", "button");
      setAttribute(button, "value", btns_values[i]);
      setAttribute(button, "name", btns_names[i]);
      button.onclick = function(event) {
        let button = event.target;
        switch (button.name) {
          case "to_begin":
            table_obj.page = 1;
            break;
          case "back":
            table_obj.page--;
            break;
          case "next":
            table_obj.page++;
            break;
          case "to_end":
            table_obj.page = table_obj._page_count();
            break;
          }
        table_obj._validate_page_number();
        table_obj.put();
      };
      buttons.push(button);
    }
    return buttons;
  }

  _page_number_input_to_html() {
    var table_obj = this;
    var input = document.createElement("input");
    setAttribute(input, "type", "number");
    setAttribute(input, "min", "1");
    setAttribute(input, "max", `${this._page_count()}`);
    setAttribute(input, "value", `${this.page}`);
    setAttribute(input, "name", `page`);
    input.onchange = function(event) {
      var value = input.value * 1; // str to int
      table_obj.page = value;
      table_obj._validate_page_number();
      table_obj.put();
    };
    return input;
  }

  _page_manager_to_html() {
    var bar = document.createElement("div");
    setAttribute(bar, "id", `bar-${this.id}`);

    var buttons = this._page_bar_buttons_to_html();
    var input = this._page_number_input_to_html();

    bar.appendChild(buttons[0]);
    bar.appendChild(buttons[1]);
    bar.appendChild(input);
    bar.appendChild(buttons[2]);
    bar.appendChild(buttons[3]);

    return bar;
  }

  paginator_html() {

    var select = this._page_size_selector_to_html();
    var bar = this._page_manager_to_html();

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

  _page_count() {
    return Math.ceil(this.rows_count / this.per_page);
  }

  _validate_page_number() {
    var pages = this._page_count();
    if (!this.page) this.page = 1;
    if (this.page > pages)
      this.page = pages; // last page
    if (this.page <= 0)
      this.page = 1; // first page
  }

  paginate_rows() {
    this._validate_page_number();
    if (this.pagination) {
      var begin_row = (this.page - 1) * this.per_page;
      var end_row = begin_row + this.per_page;
    }
    else {
      var begin_row = 0;
      var end_row = rows_count;
    }
    var paginated_rows = [];
    for (var i = begin_row; i < end_row; i++)
      paginated_rows.push(this.rows[i]);
    return paginated_rows;
  }

  toggle_column(key) {
    console.log(key);
    this.columns[key].hidden = !this.columns[key].hidden;
    this.put();
  }
}
