// Wait for the entire page to load, then hide the loading animation after 3 seconds
$(window).on("load", () => setTimeout(() => $(".pm-loader").hide(), 3000));

// Change the text color of the #req_method dropdown to match the selected option's color
$("#req_method").on("change", function() {
  let opt = this.selectedOptions[0];
  this.style.color = window.getComputedStyle(opt).color;
});

// Theme toggle: stores dark/light theme preference and applies it
$("#theme").on("change", function() {
  let isDark = +this.checked;
  setTheme(isDark);
  $.setStorage("theme", isDark);
});

// Sets the theme color and updates the toggle state
function setTheme(isDark) {
  let themes = ["#ee6d3f", "#22262a"];
  $("#title_bar").self.content = themes[isDark];
  $("#theme").checked(!!isDark);
}

// On load, apply the saved theme preference
setTheme($.getStorage("theme") || 0);

// Save state of toggle switches and initialize them on load
$("input.switch-list").on("change", function() {
  $.setStorage(this.id, +this.checked);
}).each((input) => input.checked = $.getStorage(input.id) || 0);

// Support Tab key indentation inside #raw_data textarea
$("#raw_data").on("keydown", function(e) {
  if (e.key === "Tab" || e.keyCode === 9) {
    e.preventDefault();

    let cursorPos = this.selectionStart;
    let textBefore = this.value.substring(0, cursorPos);
    let textAfter = this.value.substring(cursorPos);

    this.value = textBefore + "\t" + textAfter;
    this.selectionStart = this.selectionEnd = cursorPos + 1;
  }
});

let NodesAndTextBackup = {}, ActiveProp = "payload", rowId = 0, draggedRow;

// Dynamically builds a row in the parameters table
function buildParamFiled(data = {}) {
  let {key, value} = data,
    row = document.createElement("tr");
    rowId++;
    row.dataset["row"] = rowId;
    row.innerHTML = `
      <td>
        <div class="align-center td-group">
          <div class="grab">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><use href="icon/sprites.svg#reorder"></use></svg>
          </div>
          <input type="checkbox" class="check" id="_${rowId}" onchange="ControllAllCheck(this);">
        </div>
      </td>
      <td>
        <span>
          <input type="text" class="param key" value="${key ?? ''}" id="key_${rowId}" autocomplete="off">
          <select onchange="switchInputType(${rowId}, this);" id="${rowId}">
            <option value="text">Text</option>
            <option value="file">File</option>
          </select>
        </span>
      </td>
      <td>
        <span>
          <input type="text" class="param value" value="${value ?? ''}" id="value_${rowId}" autocomplete="off">
          <div class="delete-row" onclick="deleteRow(${rowId})">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><use href="icon/sprites.svg#delete"></use></svg>
          </div>
        </span>
      </td>`;

  $(".check", row).checked(true);
  $(".params").append(row);
  $(".param", row).on("input", () => {AutoUpdateRow(row), AutoBuildParam()});
  AutoUpdateRow(row);
  activeDragDrop();
}

// When user types in main param field, build a new row and move focus
$(".main-row .param").on("input", function() {
  let key = $("#key").val();
  let value = $("#value").val();

  buildParamFiled({key, value});
  let lastRow = $(".params tr:last-child ." + this.id).self;

  lastRow.value = this.value;
  lastRow.setSelectionRange(0, this.value.length);
  lastRow.selectionStart = lastRow.selectionEnd;
  lastRow.focus();
  this.value = '';
  AutoBuildParam();
});

// Update row name for form submission and backup the current state
function AutoUpdateRow(row) {
  if (ActiveProp === "headers") {
    let headerRow = $(".params tr").length;
    $(".header-count").text(headerRow ? `(${headerRow})` : "");
  }

  let key, valueInput = $(".value", row).self;
  if (valueInput) {
    key = $(".key", row).val();
    valueInput.name = valueInput.type === "file" ? key + "[]" : key;
  }

  NodesAndTextBackup[ActiveProp] = [].slice.call($("tr", $(".params").self));
  AutoToggleAllCheck();
}

// Hide/Show the "select all" checkbox
function AutoToggleAllCheck() {
  $("#allcheck").self.hidden = !$(".params tr").length;
}

// Construct query string from checked parameters
function AutoBuildParam(detach) {
  if (ActiveProp !== "payload") return;

  let url, origin = $("#req_url").val().split(/\?(.*)/),
      hash = ((origin[1] || "").match(/#.*/) || []).join(""),
      params = [];

  origin = url = origin.shift();
  $(".key").each((elem, i) => {
    let isChecked = $(`#${elem.id.substring(3)}`).checked(),
      value = $(".value")[i].value;
    
    if (isChecked) {
      params.push(encodeURIComponent(elem.value) + (value ? "=" + value : ""));
    }
  });

  url += "?" + params.join("&") + hash;
  if (!params.length && detach) url = origin + hash; // Detach Query

  $("#req_url").val(url);
  $(".req-url").text(url || "Untitled Request");
}

// Enable drag-and-drop sorting for table rows
function activeDragDrop() {
  $(".grab").on("touchstart mousedown", function(e) {
    e.stopImmediatePropagation();
    draggedRow = this;
    while((draggedRow = draggedRow.parentNode) && draggedRow.nodeName !== "TR") {}
    draggedRow.draggable = true;
  });

  $(".params tr").on("drop", function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    let rows = [].slice.call($(".params tr")),
      targetIndex, dragIndex;

    if (this !== draggedRow && draggedRow) {
      targetIndex = rows.indexOf(this);
      dragIndex = rows.indexOf(draggedRow);
      targetIndex > dragIndex ? this.after(draggedRow) : this.before(draggedRow);
    }
  })
  .on("dragover", (e) => e.preventDefault())
  .on("dragend touchend mouseup", function() {
    if (draggedRow) {
      draggedRow.draggable = draggedRow = false;
      AutoBuildParam();
      AutoUpdateRow();
    }
  });
}

// Handle switching between different tabs (headers, body, etc.)
$(".tab-menu li").on("click", function() {
  let prevActive, label, parent = this.parentElement;

  prevActive = $(".active", parent).self;
  this.classList.add("active");
  prevActive !== this && prevActive.classList.remove("active");

  if (parent.dataset["menu"] === "primary") {
    ActiveProp = this.dataset["prop"];
    label = this.dataset["label"];

    $(".primary-tab-section").removeClass("show");
    $(`.${ActiveProp}`).addClass("show");

    label && $(".label").text(label);
    if (ActiveProp === "body") ActiveProp = $(".body input:checked").self.dataset["prop"];
    ActiveProp === "payload" && AutoUpdateParamField();
    renderFromBackup();
  } else {
    $(".secondry-tab-section").removeClass("show");
    $(`.${this.dataset["prop"]}`).addClass("show");
  }
});

// Show authentication input based on selected auth type
$("#auth_type").on("change", function() {
  $(".auth-section, .no-auth").removeClass("show");
  $(`.${this.value}`).addClass("show");
});

// Switch activeProp when selecting different body input types
$(".body input").on("input", function() {
  ActiveProp = this.dataset["prop"];
  renderFromBackup();
});

// Backup raw text
$("#raw_data").on("input", (e) => NodesAndTextBackup["raw"] = e.target.value);

// Restore UI from backup object
function renderFromBackup() {
  $(".params").self.innerHTML = "";
  ActiveProp === "raw" ?
    $("#raw_data").val(NodesAndTextBackup.raw ?? "") :
    ($(".params").append(NodesAndTextBackup[ActiveProp]), activeDragDrop());
  AutoToggleAllCheck();
}

// Change input type of parameter value (text/file)
function switchInputType(rowId, select) {
  let valInput = $(`#value_${rowId}`).self;
  valInput.type = select.value;

  // Enable multiple file Uploader
  if (select.value === "file") valInput.multiple = true;

  select.selectedOptions[0].setAttribute('selected', true);
  AutoUpdateRow();
}

// Handle "select all" checkbox change
function ControllAllCheck(elem) {
  $('#allcheck').checked(elem.checked);
  AutoBuildParam();
  AutoUpdateRow();
}

// Delete a specific row from parameters
function deleteRow(id) {
  $(`[data-row="${id}"]`).self.remove();
  AutoBuildParam(true);
  AutoUpdateRow();
}

// Parses query string from URL and populates parameter table
function AutoUpdateParamField() {
  let entries, url = $("#req_url").val(), query = url.split(/\?([^#]*)/)[1];

  $(".req-url").text(url || "Untitled Request");

  if (ActiveProp !== "payload") return;

  delete NodesAndTextBackup["payload"];
  $(".params").text("");
  $("#allcheck").self.hidden = !query;

  if (query != null) {
    entries = query.split("&");
    $(entries).each((param) => {
      param = param.split(/=([^#]*)/);
      buildParamFiled({key: decodeURIComponent(param[0]), value: param[1]});
    });
  }
}

// Update parameters on URL input
$("#req_url").on("input", AutoUpdateParamField);

// Handle "select all" functionality for parameter checkboxes
$("#allcheck").on("change", ({target}) => {
  $(".params [type=checkbox]").each((elem) => {elem.checked = target.checked});
  AutoBuildParam(true);
});

// Search through request history
$("#search").on("input", function() {
  let matched;
  $(".histories li").each((history, i) => {
    let url = $(".history-req-url")[i].textContent.toLowerCase();
    url.indexOf($("#search").val().toLowerCase().trim()) > -1 ?
      ($(history).removeClass("hidden"), matched = true) : $(history).addClass("hidden");
  });
  $(".histories").self.dataset["history"] = !!matched;
});

// Hide UI elements on blur or outside click
function hideToggleBox(e) {
  let noClickType = e.type !== "click";
  if (noClickType || !e.target.classList.contains("btn-down")) {
    $(".tippy").removeClass("show");
  }

  if (noClickType || !e.target.classList.contains("switch-list")) {
    $(".settings").removeClass("show");
  }
}

$(document).on("click", hideToggleBox).on("visibilitychange", hideToggleBox);

// Show messages about online/offline sync status
function addInfo(status, attr, msg) {
  $(".network-wrap h4").text(status);
  $(".network-wrap p").text(msg || "All data in this workspace is backed up on our servers.");
  $(".network-wrap use").attrNS(attr);
}

function online(hidden) {
  $(".network-status use").attrNS("success");
  $(".status-type").addClass("online").text("Online");

  if (hidden === true) {
    addInfo("In sync", "synced");
  } else {
    $(".network-wrap").addClass("show");
    addInfo("You are back to online", "online", "We're trying to reconnect to our servers.");
    setTimeout(() => {
      $(".network-wrap").removeClass("show");
      addInfo("In sync", "synced");
    }, 3000);
  }
}

function offline() {
  $(".network-status use").attrNS("notsync");
  $(".status-type").removeClass("online").text("Offline");
  $(".network-wrap").addClass("show");
  addInfo("Looks like you are offline", "offline", "Until you're back online, data in your workspace may not be up to date.");
}

// Listen to browser's network changes
$(window).on("online", online).on("offline", offline);
navigator.onLine ? online(true) : offline();