// get the dashboard from the viz
var dashboard = viz.getWorkbook().getActiveSheet();

// iterate through each worksheet
dashboard.getWorksheets().forEach((worksheet) => {
    // apply a filter on the worksheet
    worksheet.applyFilterAsync("State", "Nevada", tableau.FilterUpdateType.REPLACE);
});