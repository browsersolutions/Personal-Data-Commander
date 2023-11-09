
   
   document.getElementById('backup').addEventListener('click', function() {
        // Send a message to the service worker to perform the backup
        chrome.runtime.sendMessage({
          type: 'startBackup',
          data: { key: 'value' } // Data to be sent in POST requests
        }, response => {
            console.log(response);
          if (response.backupData) {
            // Create a Blob from the combined data
            // remove the .000Z tail end of timestamps
            console.log(response.backupData);
            const blob = new Blob([JSON.stringify(response.backupData).replace(/\.000Z"/g,'"')], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
      
    // option 1: automatically download the file when pressing the button (make the link "autoclick")
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'backup.json';
      downloadLink.click();
    

       // end of option 1
/*
        // option 2: Create a text link and set the URL for download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'backup.json';
          downloadLink.textContent = 'Click here to download file';
      
       // Append the link to the body of the popup
       document.body.appendChild(downloadLink);

       // Clean up the URL object
       // Note: Do not revoke the URL immediately after appending the link to the DOM,
       // it should be revoked after the download has started.
       downloadLink.addEventListener('click', () => {
         setTimeout(() => URL.revokeObjectURL(url), 100);
        });
        // end of option 2
*/
      
            // Clean up the URL object
            URL.revokeObjectURL(url);
          } else if (response.error) {
            console.error(response.error);
          }
        });
      });
      
      document.getElementById('deleteAccountData').addEventListener('click', function() {
        // Send a message to the service worker to perform the backup
        chrome.runtime.sendMessage({
          type: 'deleteAccountData'
        }, response => {
            console.log(response);
          
        });
      });
      

      document.getElementById('importButton').addEventListener('click', () => {
        const fileInput = document.getElementById('fileInput');
        if (fileInput.files.length === 0) {
          alert('Please select a file to import.');
          return;
        }
      
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const objects = JSON.parse(event.target.result);
            // Send the objects to the service worker for processing
            chrome.runtime.sendMessage({ type: "importData", data: objects });
          } catch (e) {
            alert('Error parsing JSON file: ' + e.message);
          }
        };
        
        reader.readAsText(file);
      });
      


      // Populate the select element with options for days 1 through 31
const daySelect = document.getElementById('daySelect');
for (let i = 1; i <= 31; i++) {
  const option = document.createElement('option');
  option.value = i;
  option.textContent = `${i} day${i > 1 ? 's' : ''}`;
  daySelect.appendChild(option);
}

// Add click event listener to the button
document.getElementById('sendButton').addEventListener('click', () => {
  const selectedDay = daySelect.value;
  // Send the selected value to the background page
  chrome.runtime.sendMessage({ type: "set_click_data_expiration_period", selectedDayCount: parseInt(selectedDay) }, (response) => {
    console.log('Response from background:', response);
  });
});

