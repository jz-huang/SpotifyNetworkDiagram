// register to the event
function listenToMarksSelection() {
    viz.addEventListener(tableau.TableauEventName.MARKS_SELECTION, onMarksSelection);
}

// handle the marks selection event
function onMarksSelection(marksEvent) {
    // get the marks from the event
    return marksEvent.getMarksAsync().then(addCommentsToMarks);
}

function addCommentsToMarks(marks) {
    // your custom logic for adding comments to the marks
}