// triggered when user hits submit from the UI
function onSubmitComment(comment) {
    worksheet.getSelectedMarksAsync().then((marks) => {
        addCommentToMarks(comment, marks);

        // refresh the viz to show new data
        viz.refreshDataAsync();
    });
}

function addCommentToMarks(marks, comment) {
    // iterate through each mark
    marks.forEach((mark) => {
        //write the mark and comment back to your database
        yourCustomWriteFunction(mark, comment);
    });
}