document.addEventListener('DOMContentLoaded', () => {
    
    const mainView = document.getElementById('mainView');

    mainView.addEventListener('dom-ready', () => {
        
        // console.log("renderer index dom ready!");
         
        // console.log("mainView: ", mainView);

        // console.log("window: ", window);

        document.getElementById('mainView').style.height = (window.innerHeight * 1.0) + 'px';

         
     });
    

});
