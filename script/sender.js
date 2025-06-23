let xhr, sending, histories = $.getStorage("histories") || [], timeout;

// Update Send button appearance and request state
function switchButtonAndState(type, btnText, method) {
  $(".response-state, #sendButton")[method + "Class"]("sending"); // Add or remove 'sending' class
  $(".tippy").removeClass("show"); // Hide tooltip
  $("#sendButton").text(btnText).self.type = type;
  sending = false; // Mark request as not sending
}

function addHistory(method, url, color, dt, si, noStore) {
  let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    date = new Date,
    li = document.createElement("li"),
    opt = $("#req_method").self.selectedOptions[0];

  // Format current date for display
  dt = date.toLocaleString()
    .replace(/^(?:(\d+)\/(\d+)\/)/, (_, m, d) =>  {
    return (+d < 10 ? "0" + d : d) + " " + (months[+m - 1]) + " ";
  }).replace(/:\d+\s/, " ");

  si = si || $("#req_method").self.selectedIndex;

  // Build the list item with method, URL, and delete button
  url = url || $("#req_url").val();
  color = color || opt.style.color;
  method = method || opt.value;
  method = method.length >= 6 ? method.substring(0, 3) : method;
  li.innerHTML = `
    <span class="ws" data-date="${dt}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <use href="icon/sprites.svg#user"></use>
      </svg>
    </span>
    <div class="wrap"><span class="history-req-type" style="color:${color}">${method}</span></div>
    <span class="history-req-url">${url}</span>
    <span class="delete" onclick="deleteHistory(event, this.parentElement);">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <use href="icon/sprites.svg#delete"></use>
      </svg>
    </span>`;

  $(".histories").self.prepend(li); // Add to top of history
  $(li).on("click", () => addRequestFromHistory(url, si)); // Load request on click

  // Save to localStorage unless explicitly skipped
  if (!noStore) {
    histories.push({method, url, color, dt, si});
    $.setStorage("histories", histories);
  }
}

function deleteHistory(e, history) {
  e.stopPropagation();
  let lists = [].slice.call($(".histories li")).reverse();
  delete histories[lists.indexOf(history)];
  history.remove();
  $.setStorage("histories", histories = histories.flat());
}

function hideSidebar() {
  let isAbsPos = window.getComputedStyle($(".side-bar").self).position === "absolute";
  isAbsPos && $("#sidebar-toggle").checked(true);
}

function addRequestFromHistory(url, si) {
  $("#req_url").val(url);
  $("#req_method option")[si].selected = true;
  AutoUpdateParamField();
  hideSidebar();
}

$(histories).each(({method, url, color, dt, si}) => {
  addHistory(method, url, color, dt, si, true);
});

$("#clear").on("click", () => {
  $(".histories").text("");
  $.setStorage("histories", []);
  showToast("History has been cleared");
  hideSidebar();
});

function showToast(message) {
  $(".html-root").text(message);
  $(".notification").addClass("show");
  timeout = setTimeout(hideToast, 3000);
}

function hideToast() {
  window.clearTimeout(timeout);
  $(".notification").removeClass("show");
}

function errorCallback(statusText) {
  $(".response-state").removeClass("success").addClass("error");
  $(".response-error").text(statusText);
  switchButtonAndState("submit", "Send", "remove");
}

function buildFormData(backup, form) {
  let dataType = $("[name=body]:checked").self.dataset["prop"];
  let formData = new FormData(form);
  let url = $("#req_url").val();
  let authType = $("#auth_type").val();
  let rnoContent = /^(?:GET|HEAD|MKCOL|COPY|MOVE|DELETE|UNLOCK)$/;
  let rQuery = /\?/;
  let defaultHeaders = {
    "Postman-Token": crypto.randomUUID(),
    "Connection": "keep-alive",
    "Accept": "*/*",
    "Cache-Control": "no-cache"
  };

  // formData is being added to the default headers.
  for(let name in defaultHeaders) {
    formData.append(`headers[${name}]`, defaultHeaders[name]);
  }

  // formData is being added to the request headers.
  $(backup.headers).each((el) => {
    let header = $(".value", el).self;
    if ($(".check:checked", el).length) {
      formData.append(`headers[${header.name}]`, header.value);
    }
  });

  // formData is being added to the Authorization
  if (authType !== "no-auth") {
    let key, value, addTo, auth = $(`.${authType}`).self;

    // For API Auth
    if (authType === "api-auth") {
      addTo = $("#switch_auth").val();
      key = $("#auth_key").val();
      value = $("#auth_value").val();

      if (key) {
        if (addTo === "headers") {
          formData.append(`headers[${key}]`, value);
        } else {
          url += (rQuery.test(url) ? "&" : "?") + encodeURIComponent(key) + "=" + value;
          formData.set("url", url);
        } 
      }
    }
    // For Bearer or Basic Auth
    else if (authType === "bearer-auth" || authType === "basic-auth") {
      authType = authType.slice(0, -5).replace(/^[a-z]/, (m) => m.toUpperCase());
      auth = {
        "Bearer": $("#auth_token").val(),
        "Basic": btoa($("#username").val() +":"+ $("#password").val())
      };
      
      if ((value = auth[authType])) {
        formData.append("headers[Authorization]", `${authType} ${value}`);
      }
    }
  }

  // formData is being added to the body or raw data
  if (dataType && !rnoContent.test($("#req_method").val())) {
    if (dataType !== "raw") {
      $(backup[dataType]).each((el) => {
        if ($(".check:checked", el).length) {
          let valueInput = $(".value", el).self, files = valueInput.files,
          name = valueInput.name;
          
          files ? $([].slice.call(files)).each((file) => {
            if (file instanceof File) {
              formData.append(name, file);
            }
          }) : formData.append(`body[${name}]`, valueInput.value);
        }
      });
    // formData is being added to the headers and raw data
    } else if ($("#raw_data").val()) {
      formData.set(`body`, $("#raw_data").val());
      formData.append("headers[Content-Type]", $("#raw_type").val());
    }
  }

  // formData is being added to the SSL Verification
  formData.set("SSL-Verification", +$("#verify_ssl").checked());
  return formData;
}

function addResponse(lines) {
  $("#response").text("");
  $(lines).each((line) => {
    let li = document.createElement("li");
    li.textContent = line;
    $("#response").append(li);
  });
}

function addCookies(cookies, domain) {
  $(".res-cookie-count, #cookie-jar").text("");
  $(cookies).each((cookie) => {
    let row = document.createElement("tr"), parts = cookie.split("; "),
      [name, value] = parts.shift().split("="),
      objParts = {name, value};

    $(parts).each((part) => {
      [key, value] = part.split("=");
      objParts[key.toLowerCase()] = value;
    });

    objParts.domain = (objParts.domain || domain).replace(/^\./, "");
    row.innerHTML = `
      <td><input readonly>${objParts.name}</td>
      <td><input readonly>${objParts.value}</td>
      <td><input readonly>${objParts.domain}</td>
      <td><input readonly>${objParts.path}</td>
      <td><input readonly>${objParts.expires ?? "Session"}</td>
      <td><input readonly>${objParts.hasOwnProperty("httponly")}</td>
      <td><input readonly>${objParts.hasOwnProperty("secure")}</td>`;

    $("#cookie-jar").append(row);
  });

  cookies.length && $(".res-cookie-count").text(`(${cookies.length})`);
  $(".response-cookies").self.hidden = !cookies.length;
}

function addHeaders(headers) {
  let row, match, i = 0, rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg;

  $("#response-headers").text("");
  while((match = rheaders.exec(headers))) {
    row = document.createElement("tr");
    row.innerHTML = `
      <td style="text-transform:capitalize;"><input readonly>${match[1]}</td>
      <td><input readonly>${match[2]}</td>`;

    $("#response-headers").append(row);
    i++;
  }
  
  i && $(".res-header-count").text(`(${i})`);
  $(".response-headers").self.hidden = !i;
}

function formatMemUnit(bytes) {
  let units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"],
    factor = Math.floor(Math.log(bytes) / Math.log(1024));
  return (Math.round(bytes / Math.pow(1024, factor) * 10) / 10) + " " + units[factor];
}

function downloadResponse(blobUrl) {
  let link = document.createElement("a");
  link.download = "response";
  link.href = blobUrl;
  link.click();
  showToast("Downloaded Response");
}

$("form").on("submit", function(e) {
  e.preventDefault();

  $("#req_url").removeClass("error");
  if (!$("#req_url").val()) return $("#req_url").addClass("error");
  switchButtonAndState("button", "Cancel", "add");
  addHistory();

  let res, error, blob, isDownload = e.submitter.dataset["download"],
    formData = buildFormData(NodesAndTextBackup, this);

  xhr = new XMLHttpRequest();
  xhr.open("POST", this.action, true);
  xhr.responseType = "json";

  xhr.onerror = xhr.ontimeout = () => {
    errorCallback(xhr.statusText || "Could not send request");
  };

  xhr.onload = function() {
    res = xhr.response;

    if (res == null || (error = res.error)) {
      errorCallback(error || "Server not respond, Something went wrong!");
      return;
    }

    addResponse(res.response.split(/\r?\n/));
    addCookies(res.cookies, res.domain);
    addHeaders(res.headers);

    blob = new Blob([res.response], {type: res.ct});
    $(".status").text(`${res.status} ${res.statusText}`);
    $(".time").text(`${Math.round(res.time * 1000)} ms`);
    $(".size").text(formatMemUnit(res.bytes));
    $("#preview").self.srcdoc = res.response;
    $(".response-state").addClass("success");
    switchButtonAndState("submit", "Send", "remove");
    isDownload && downloadResponse(URL.createObjectURL(blob));
  };
  
  xhr.send(formData);
  sending = true;
});

$("#sendButton").on("click", () => {
  if (sending && xhr) {
    setTimeout(() => switchButtonAndState("submit", "Send", "remove"));
    sending = false;
    xhr.abort();
  }
});

// Reset all data and elements to send new requests
$("#new").on("click", () => {
  hideSidebar();
  let defaultOpt = $("#req_method option:first-child").self;
  defaultOpt.selected = true;
  defaultOpt.parentElement.removeAttribute("style");
  $(".primary-section input").val("");
  $(".req-url").text("Untitled Request");
  $("#allcheck").self.hidden = true;
  $("#none").checked(true);
  $(".label").text("Query Params");
  $(".params").text("");
  $(".tab-menu li").removeClass("active");
  $(".tab-menu li:first-child").addClass("active");
  $(".primary-tab-section, .secondry-tab-section").removeClass("show");
  $(".payload, #response").addClass("show");
  $(".response-state, #req_url").removeClass("success error");
  $("#response, #cookie-jar, #response-headers").text("");
  $("#preview").self.removeAttribute("srcdoc");
  $(".response-error").text("Enter the URL and click Send to get a response.");
  $(".counter").text("");
  NodesAndTextBackup = {};
  ActiveProp = "payload";
});