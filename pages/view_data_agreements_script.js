
//const server_url = "http://localhost:3000";
const server_url = "https://api.cybotix.no";

const URI_plugin_user_read_all_agreements = "/plugin_user_read_all_data_agreements";
const URI_plugin_user_delete_data_agreement = "/plugin_user_delete_data_agreement";
const URI_plugin_user_read_data_agreement = "/plugin_user_read_data_agreement";
const URI_plugin_user_set_agreement_active_status = "/plugin_user_set_agreement_active_status";

const plugin_uuid_header_name = "installationUniqueId";



const browser_id = chrome.runtime.id;

// Function to use "fetch" to delete a data row
async function deleteDataRow(agreement_id) {
  try {

        let plugin_uuid = await chrome.storage.local.get(['installationUniqueId']);


    const userid = "";
    //console.log("deleting: " + id);
    const message_body = JSON.stringify({ agreement_id: agreement_id });
    //console.log(message_body);
    // Fetch data from web service (replace with your actual API endpoint)
    const response = await fetch(server_url + URI_plugin_user_delete_data_agreement, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId
      },
      body: message_body // example IDs, replace as necessary
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


// Function to use "fetch" to delete a data row
async function deleteDataRowByUUID(uuid) {
  try {
    let plugin_uuid = await chrome.storage.local.get(['installationUniqueId']);

    const userid = "";
    const message_body = JSON.stringify({ agreement_id: uuid });
    //console.log(message_body);
    // Fetch data from web service (replace with your actual API endpoint)
    const response = await fetch(server_url + URI_plugin_user_delete_data_agreement, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId
      },
      body: message_body // example IDs, replace as necessary
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

// Function to use "fetch" to suspend a data agreement
async function suspendByUUID(uuid) {
  try {
    let plugin_uuid = await chrome.storage.local.get(['installationUniqueId']);

    const userid = "";
    const message_body = JSON.stringify({ agreement_id: uuid, activestatus: "0" });
    //console.log(message_body);
    // Fetch data from web service (replace with your actual API endpoint)
    const response = await fetch(server_url + URI_plugin_user_set_agreement_active_status, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId
      },
      body: message_body // example IDs, replace as necessary
    });
    //console.log(response);
    // Check for errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
// update the row in the table


    // Parse JSON data
    const data = await response.json();



  } catch (error) {
    console.error(error);
  }
}


// Function to use "fetch" to re-activate a data agreement
async function activateByUUID(uuid) {
  try {
    let plugin_uuid = await chrome.storage.local.get(['installationUniqueId']);

    const userid = "";
    const message_body = JSON.stringify({ agreement_id: uuid, activestatus: "1" });
    //console.log(message_body);
    // Fetch data from web service (replace with your actual API endpoint)
    const response = await fetch(server_url + URI_plugin_user_set_agreement_active_status, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId
      },
      body: message_body // example IDs, replace as necessary
    });
    //console.log(response);
    // Check for errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
// update the row in the table

    // Parse JSON data
    const data = await response.json();



  } catch (error) {
    console.error(error);
  }
}



// Function to suspend all data agreements (not already suspended)
async function suspendAll() {
  console.log("suspendAll");
  try {
  }catch(e){
    console.error(e);
  }
}


// Function to activate all data agreements (not already active)
async function activateAll() {
  console.log("activateAll");
  try {
  }catch(e){
    console.error(e);
  }
}



// Function to fetch data and populate the table
async function fetchData() {
  try {

    
    let plugin_uuid = await chrome.storage.local.get(['installationUniqueId']);


    // Fetch data from web service (replace with your actual API endpoint)
    const response = await fetch(server_url + URI_plugin_user_read_all_agreements, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [plugin_uuid_header_name]: plugin_uuid.installationUniqueId
      },
    });

    // Check for errors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    var utc = new Date().toJSON().slice(0, 10).replace(/-/g, '/');
    console.log(utc);
    console.log(Date.now());
    var now = new Date;
    var utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    console.log(utc_timestamp);
    console.log(new Date().toISOString());

    // Parse JSON data
    const data = await response.json();

    // Get table body element
    const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
    if (tableBody.rows.length) {
      tableBody.rows.forEach(row => {
        if (row) row.deleteRow();
      });
    }
    // Loop through data and populate the table
    data.forEach(row => {
      console.log(row);
      //        console.log(row.url);

      // Create new row
      const newRow = tableBody.insertRow();
      //console.log(newRow);
      // Create cells and populate them with data
      const cell1 = newRow.insertCell(0);
      const cell2 = newRow.insertCell(1);
      const cell3 = newRow.insertCell(2);
      const cell4 = newRow.insertCell(3);
      const cell5 = newRow.insertCell(4);
      const cell6 = newRow.insertCell(5);
      cell1.textContent = row.uuid;
      cell2.textContent = row.createtime;
      cell3.textContent = row.lastmodifiedtime;
      cell4.textContent = row.counterparty_name;
      cell5.textContent = row.json;
      cell6.textContent = row.active;

      // Add delete button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = function () {
        // Remove the row from the table
        newRow.remove();
        // call to API to delete row from data base
        deleteDataRowByUUID(row.uuid);
      };

      // Add suspend button
      const suspendButton = document.createElement('button');
      suspendButton.textContent = 'Suspend';
      suspendButton.onclick = function () {
        // add functionality to toggle active/suspend buttons
        suspendByUUID(row.uuid);
      };

      // Add activate button
      const activateButton = document.createElement('button');
      activateButton.textContent = 'Activate';
      activateButton.onclick = function () {
        // add functionality to toggle active/suspend buttons
        activateByUUID(row.uuid);
      };


      // action buttons
      const cell7 = newRow.insertCell(6);
      cell7.appendChild(deleteButton);
      const cell8 = newRow.insertCell(7);
      cell8.appendChild(suspendButton);
      const cell9 = newRow.insertCell(8);
      cell9.appendChild(activateButton);

      // Adding data-label for mobile responsive
      cell1.setAttribute('data-label', 'UTC');
      cell2.setAttribute('data-label', 'localtime');
      cell2.setAttribute('data-label', 'url');

    });
  } catch (error) {
    console.error(error);
  }
}


// Locate all elements with the class "my-button"
const buttons = document.querySelectorAll('.sortableCol');
len = buttons.length;
for (var i = 0; i < buttons.length; i++) {
  //work with checkboxes[i]
  console.log(buttons[i]);
  // set column index number for each column
  buttons[i].setAttribute("colindex", i);
  buttons[i].addEventListener('click', function (event) {
    sortTa();
  }, false);

}



// Locate all cells that are used for filtering of search results
const f_cells = document.querySelectorAll('.filterableCol');
console.log(f_cells);
len = f_cells.length;
for (var i = 0; i < f_cells.length; i++) {
  //work with regexp in cell
  console.log(f_cells[i]);
  // set column index number for each column
  f_cells[i].setAttribute("colindex", i);
  f_cells[i].addEventListener('input', function (event) {
    filterTable_a();
  }, false);

}


// Sort states for each column
const sortStates = {
  0: 'none',  // None -> Ascending -> Descending -> None -> ...
  1: 'none'
};

function sortTa() {

  sortTable(event.target);
}

// Function to sort the table
function sortTable(colheader) {
  const columnIndex = colheader.parentNode.getAttribute("colindex");
  console.log("sortable: " + columnIndex, colheader)

  const table = document.getElementById('dataTable');

  let rows = Array.from(table.rows).slice(1);  // Ignore the header
  let sortedRows;

  // Toggle sort state for the column
  if (sortStates[columnIndex] === 'none' || sortStates[columnIndex] === 'desc') {
    sortStates[columnIndex] = 'asc';
  } else {
    sortStates[columnIndex] = 'desc';
  }

  // Sort based on the selected column and sort state
  // Consider options for different types of sorting here. 
  if (columnIndex === 0) {
    sortedRows = rows.sort((a, b) => {
      return Number(a.cells[columnIndex].innerText) - Number(b.cells[columnIndex].innerText);
    });
  } else {
    sortedRows = rows.sort((a, b) => a.cells[columnIndex].innerText.localeCompare(b.cells[columnIndex].innerText));
  }

  if (sortStates[columnIndex] === 'desc') {
    sortedRows.reverse();
  }

  console.log(sortedRows);
  // Remove existing rows
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  // Append sorted rows
  const tbody = table.getElementsByTagName('tbody')[0];
  sortedRows.forEach(row => tbody.appendChild(row));
}



function filterTable_a() {
  //  console.log("filterTable_a " );

  filterTable(event.target);
}


function filterTable(colheader) {
  const columnIndex = colheader.parentNode.getAttribute("colindex");
  //console.log(colheader);
  console.log("filter on col: " + columnIndex)
  //const input = colheader;
  const filter = colheader.value.toUpperCase();
  const table = document.getElementById('dataTable');
  const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
  //console.log("filter column:" + columnIndex);
  //console.log("filter value:" + filter);

  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i].getElementsByTagName('td')[columnIndex];
    //console.log(cell);
    if (cell) {
      const content = cell.innerText || cell.textContent;
      if (new RegExp(filter, 'i').test(content)) {
        //        console.log("not sho");
        rows[i].style.display = '';
      } else {
        rows[i].style.display = 'none';
      }
    }
  }
}


// Fetch data on page load
fetchData();


document.getElementById('dataAgreementsRefreshButton').addEventListener('click', fetchData());

document.getElementById('dataAgreementsSuspendAllButton').addEventListener('click', suspendAll());

document.getElementById('dataAgreementsActivateAllButton').addEventListener('click', activateAll());


