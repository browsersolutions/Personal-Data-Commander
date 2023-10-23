const sidebarBtn = document.querySelector(".sidebar-collapser")
const sidebar = document.querySelector(".sidebarBox");
sidebarBtn.addEventListener('click', function(){
 sidebar.classList.toggle('active');
})