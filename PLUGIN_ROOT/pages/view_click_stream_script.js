const server_url = "https://api-dev.cybotix.no";

const URI_plugin_user_get_all_clicks = "/plugin_user_get_all_clicks";
const URI_plugin_user_delete_click = "/plugin_user_delete_click";
const URI_plugin_user_delete_all_clickdata =
  "/plugin_user_delete_all_clickdata";

const plugin_uuid_header_name = "installationUniqueId";

//const browser_id = chrome.runtime.id;

// Function to use "fetch" to delete a data row
async function deleteDataRow(uuid) {
  try {
    console.log("deleting row: " + uuid);
    // userid is collected from authenticated session.
    const userid = "";
    let plugin_uuid = await chrome.storage.local.get(["installationUniqueId"]);

    const message_body = JSON.stringify({ linkid: uuid });
    // Fetch data from web service (replace with your actual API endpoint)
    const response = await fetch(server_url + URI_plugin_user_delete_click, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId,
      },
      body: message_body, // example IDs, replace as necessary
    });
    //console.log(response);
    // Check for errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON data
    const data = await response.json();
  } catch (error) {
    console.error(error);
  }
}




      // Populate the select element of the dropdwon list for number of days to keep click data active, with options for days 1 through 31'
      // check for the current value of  chrome.storage.local.get(['clickDataLifetimeHours']) to determine which option to pre-select
      // Note: The value in clickDataLifetimeHours is for hours and must be divided by 24 accordingly. 

    //  chrome.storage.local.get(['clickDataLifetimeHours']),then(function (result) {
    //    console.log('click data lifetime value currently is ' + result.clickDataLifetimeHours + " days");
    //  });
 chrome.storage.local.get(['clickDataLifetimeHours']).then(function (result) {
        console.log('click data lifetime value currently is ' + result.clickDataLifetimeHours + " days");
        console.log('click data lifetime value currently is ' + result.clickDataLifetimeHours + " hours or " + Math.round(result.clickDataLifetimeHours/24) + " days");

        

      const daySelect = document.getElementById('daySelect');
      for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} day${i > 1 ? 's' : ''}`;
        // Check if the current value is equal to the already set value, if so, set it as selected
    if (i === Math.round(result.clickDataLifetimeHours/24) ) {
        option.selected = true;
    }
        daySelect.appendChild(option);
      }

      return result.clickDataLifetimeHours;
    });

      // Add click event listener to the "update lifetime of clickdata" drop-down
      daySelect.addEventListener('change', function(event) {
        // Call your function here
        // 'this' refers to the select element
        // 'this.value' will give you the selected value
        handleDaySelection(this.value);
  // Send the selected value to the background page
  chrome.runtime.sendMessage({ type: "set_click_data_expiration_period", selectedDayCount: parseInt(this.value) }, (response) => {});

    });
    
    function handleDaySelection(selectedDay) {
        console.log(`Selected day: ${selectedDay}`);
        // Add your logic here that should run when a new day is selected
    }
    

// Function to fetch data and populate the table
async function fetchData() {
  console.log("fetchData");
  try {
    let plugin_uuid = await chrome.storage.local.get(["installationUniqueId"]);
    console.debug(plugin_uuid);
    const opts = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId,
      },
    };

    console.debug(JSON.stringify(opts));
    let response = await fetch(
      server_url + URI_plugin_user_get_all_clicks,
      opts
    );
    console.debug(response);
    let data = await response.json();
    console.debug(data);

    var utc = new Date().toJSON().slice(0, 10).replace(/-/g, "/");
    console.log(utc);
    console.log(Date.now());
    var now = new Date();
    var utc_timestamp = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    );
    console.log(utc_timestamp);
    console.log(new Date().toISOString());

    // Get table body element
    const tableBody = document
      .getElementById("dataTable")
      .getElementsByTagName("tbody")[0];

    if (tableBody.rows.length) {
      tableBody.rows.forEach((row) => {
        if (row) row.deleteRow();
      });
    }
    // Loop through data and populate the table
    data.forEach((row) => {
      //       console.log(row);
      //        console.log(row.url);

      // Create new row
      const newRow = tableBody.insertRow();
      //console.log(newRow);
      // Create cells and populate them with data
      const cell1 = newRow.insertCell(0);
      const cell2 = newRow.insertCell(1);
      const cell3 = newRow.insertCell(2);
      // const cell4 = newRow.insertCell(3);

      cell1.textContent = row.linkid;
      cell1.setAttribute("name", "linkid");
      cell2.textContent = row.utc;

      // cell3.textContent = row.url;
      const anchor = document.createElement("a");

      // Set the anchor's text and href attributes
      anchor.href = row.url;
      anchor.target = "_blank";
      anchor.title = row.url;
      if (row.url.length > 100) {
        // Trim the string to 100 characters and add ellipses
        anchor.textContent = row.url.slice(0, 100) + "...";
      } else {
        anchor.textContent = row.url;
      }
      // Append the anchor to the cell
      cell3.appendChild(anchor);
      // cell4.textContent = row.url;

      // Add delete button
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("deleteBtn");
      deleteButton.onclick = function () {
        // Remove the row from the table
        newRow.remove();

        // call to API to delete row from data base
        deleteDataRow(row.linkid);
      };
      // Add View button
      const viewButton = document.createElement("button");
      viewButton.classList.add("viewBtn");
      viewButton.addEventListener("click", () =>
        window.open(row.url, "_blank")
      );

      const cell4 = newRow.insertCell(3);
      cell4.appendChild(viewButton);
      cell4.appendChild(deleteButton);

      // Adding data-label for mobile responsive
      cell1.setAttribute("data-label", "UTC");
      // cell2.setAttribute('data-label', 'localtime');
      cell2.setAttribute("data-label", "url");
    });
  } catch (error) {
    console.error(error);
  }
}

// Function to delete all data
async function deleteAll() {
  try {
    let plugin_uuid = await chrome.storage.local.get(["installationUniqueId"]);
    const opts = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId,
      },
    };

    console.log("Payload", JSON.stringify(opts));
    let response = await fetch(
      server_url + URI_plugin_user_delete_all_clickdata,
      opts
    );
    if (response.ok) {
      // Get table body element
      const tableBody = document
        .getElementById("dataTable")
        .getElementsByTagName("tbody")[0];

      if (tableBody.rows.length) {
        tableBody.rows.forEach((row) => {
          if (row) row.deleteRow();
        });
      }
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
  }
}

// Toggle data row
async function suspendToggle(actionType, linkId) {
  try {
    console.log(actionType, linkId);
  } catch (error) {
    console.log(error);
  }
}

// Locate all elements with the class "my-button"
const buttons = document.querySelectorAll(".sortableCol");
len = buttons.length;
for (var i = 0; i < buttons.length; i++) {
  //work with checkboxes[i]
  console.log(buttons[i]);
  // set column index number for each column
  buttons[i].setAttribute("colindex", i);
  buttons[i].addEventListener(
    "click",
    function (event) {
      sortTa();
    },
    false
  );
}

// Locate all cells that are used for filtering of search results
const f_cells = document.querySelectorAll(".inputField");
console.log(f_cells);

//below code to get input action for gobal search
f_cells[0].addEventListener(
  "input",
  function (event) {
    filterTable_a();
  },
  false
);

//below code is for get action by column
// len = f_cells.length;
// for (var i = 0; i < f_cells.length; i++) {
//     //work with regexp in cell
//     console.log(f_cells[i]);
//     // set column index number for each column
//     f_cells[i].setAttribute("colindex", i);
//     console.log('1010',i);
// f_cells[i].addEventListener('input', function (event) {
//     filterTable_a();
// }, false);

// }

// Sort states for each column
const sortStates = {
  0: "none", // None -> Ascending -> Descending -> None -> ...
  1: "none",
};

function sortTa() {
  sortTable(event.target);
}

// Function to sort the table
function sortTable(colheader) {
  const columnIndex = colheader.getAttribute("colindex");
  console.log("sortable: " + columnIndex);
  colheader.classList.toggle("fixed-header-ascending");
  const table = document.getElementById("dataTable");

  let rows = Array.from(table.rows).slice(1); // Ignore the header
  let sortedRows;

  // Toggle sort state for the column
  if (
    sortStates[columnIndex] === "none" ||
    sortStates[columnIndex] === "desc"
  ) {
    sortStates[columnIndex] = "asc";
  } else {
    sortStates[columnIndex] = "desc";
  }

  // Sort based on the selected column and sort state
  // Consider options for different types of sorting here.
  if (columnIndex === 0) {
    sortedRows = rows.sort((a, b) => {
      return (
        Number(a.cells[columnIndex].innerText) -
        Number(b.cells[columnIndex].innerText)
      );
    });
  } else {
    sortedRows = rows.sort((a, b) =>
      a.cells[columnIndex].innerText.localeCompare(
        b.cells[columnIndex].innerText
      )
    );
  }

  if (sortStates[columnIndex] === "desc") {
    sortedRows.reverse();
  }

  console.log(sortedRows);
  // Remove existing rows
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  // Append sorted rows
  const tbody = table.getElementsByTagName("tbody")[0];
  sortedRows.forEach((row) => tbody.appendChild(row));
}

function filterTable_a() {
  //  console.log("filterTable_a " );

  filterTable(event.target);
}

function filterTable(colheader) {
  const columnIndex = 2;
  //console.log(colheader);
  console.log("filter on col: " + columnIndex);
  //const input = colheader;
  const filter = colheader.value.toUpperCase();
  const table = document.getElementById("dataTable");
  const rows = table
    .getElementsByTagName("tbody")[0]
    .getElementsByTagName("tr");
  //console.log("filter column:" + columnIndex);
  //console.log("filter value:" + filter);

  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i].getElementsByTagName("td")[columnIndex];
    //console.log(cell);
    if (cell) {
      const content = cell.innerText || cell.textContent;
      console.log(content);
      if (new RegExp(filter, "i").test(content)) {
        //        console.log("not sho");
        rows[i].style.display = "";
      } else {
        rows[i].style.display = "none";
      }
    }
  }
}

// Fetch data on page load
fetchData();

document
  .getElementById("clickHistoryRefreshButton")
  .addEventListener("click", fetchData);

document.getElementById('clickHistoryDeleteAllButton').addEventListener('click', function() {
    // Send a message to the service worker to perform the backup
  
    chrome.runtime.sendMessage({
      type: 'deleteAllClickData'
      
    }, response => {
        console.log(response);
      });
  });


document.getElementById('clickHistoryDeleteExpiredButton').addEventListener('click', function() {
    // Send a message to the service worker to perform the backup
  
    chrome.runtime.sendMessage({
      type: 'deleteExpiredClickData'
      
    }, response => {
        console.log(response);
      });
  });

