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
    for (let i in keys)
      this[keys[i]] = values[i];
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

  add_column(key, value, after=false) {
    if (key in this.keys) {
      this.values[this.keys.indexOf(key)] = value;
      this[key] = value;
      return;
    }

    var after_ind = this.keys.indexOf(after);
    this.keys.splice(after_ind + 1, 0, key);
    this.values.splice(after_ind + 1, 0, value);
    this[key] = value;
  }

  to_html(keys) {
    if (document.getElementById(this.id))
        document.getElementById(this.id).remove();
    var tr = document.createElement("tr");
    setAttribute(tr, "id", this.id);
    setAttribute(tr, "class", this.table.id);

    var html = ``;
    if (keys)
      for (let i in keys)
        html += `<td id="${this.id}-${keys[i]}"><p>${this[keys[i]]}</p></td>`;
    else
      for (let i in this.keys)
        html += `<td id="${this.id}-${this.keys[i]}"><p>${this[this.keys[i]]}</p></td>`;

    tr.innerHTML = html;
    tr.onclick = onclick;
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
    sbmt.onclick = this.on_form_save;
    form.appendChild(sbmt);

    editing_rows[this.id] = this;

    return form;
  }

  on_form_save(a) {
    var row = editing_rows[this.getAttribute("row-id")];
    tmp = row;
    var form = document.getElementById(`edit-${row.id}`);
    var inputs = document.getElementsByClassName(`edit-${row.id}`);
    for (let i in inputs) {
      row.set(inputs[i].name, inputs[i].value, true);
    }
    form.remove();
  }

  onclick = function(){};
  onupdate = function(){};
}

class Table {
  constructor(
    parent,    // Node
    attributes, // {"class": "class_name", "name": "why?"}
    columns,   // [{label: "", sort_func: function () {}, key: "", hidden: false}, ...]
    pagination // [5, 10, 15] (elements per page, if no pagination skip this)
  ) {
    this.parent = parent;
    this.id = `tbl-${getRandomInt(2**32)}`;
    this.table = document.createElement('table');

    for (let attr in attributes)
        setAttribute(this.table, attr, attributes[attr]);
    setAttribute(this.table, "id", this.id);

    this.attributes = attributes;
    this.columns = {};
    for (let i in columns)
      this.columns[columns[i].key] = {label: columns[i].label,
                                      sort_func: columns[i].sort_func,
                                      hidden: columns[i].hidden ? true : false}

    this.pagination = pagination;
    this.per_page = pagination[pagination.length / 2];
    this.page = 1;
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

  put() {
    this.table.innerHTML = '';
    var keys = [];
    for (let key in this.columns)
      if (!this.columns[key].hidden)
        keys.push(key);

    var selected_rows = this.paginate_rows();
    for (var i in selected_rows) {
      this.table.appendChild(selected_rows[i].to_html());
    }

    this.parent.innerHTML = '';
    this.parent.appendChild(this.table);
  }

  paginate_rows() {
    var pages = Math.ceil(this.rows_count / this.per_page);
    if (this.page > pages)
      this.page = pages; // last page
    if (this.page < 0)
      this.page = 1; // first page
    var begin_row = this.page * this.per_page;
    var end_row = begin_row + this.per_page;
    var paginated_rows = [];
    for (var i = begin_row; i < end_row; i++)
      paginated_rows.push(this.rows[i]);
    return paginated_rows;
  }
}
