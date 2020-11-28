function GmailCleanerMain() {
    const scriptStartDate = new Date();

    // Please fill in the conditions of the email to be deleted.
    const searchCondition = [
        'category:social',
        'subject:GmailCleaner Report'
    ];
    // Emails older than the specified period will be deleted.
    const delayDays = "1m";
    // This condition always applies.
    const baseCondition = [
        'older_than:' + delayDays,
        '-is:starred',
        'is:read'
    ];

    const deleteLog = Cleaner(scriptStartDate, searchCondition, baseCondition);

    if (deleteLog.size) {
        const sortedLog = new Map([...deleteLog.entries()].sort((a, b) => a[0] - b[0]));
        const address = Session.getEffectiveUser().getEmail();
        MailApp.sendEmail(address, 'GmailCleaner Report', Array.from(sortedLog.values()).join("\n"));
    };
}


function CreateDateStr(dt) {
    return Utilities.formatDate(dt, Session.getTimeZone(), "yyyy-MM-dd HH:mm:ss");
}


function Cleaner(scriptStartDate, searchCondition, baseCondition) {
    var deleteLog = new Map();
    const MAX_SIZE = 500;
    searchCondition.forEach(function(elem) {
        const mergeCondition = baseCondition.concat(elem).join("\u0020");

        var response = GmailApp.search(mergeCondition, 0, MAX_SIZE);
        do {
            response.forEach(function(thread) {
                thread.getMessages().forEach(function(msg) {

                    const dt = msg.getDate();
                    deleteLog.set(dt, [CreateDateStr(dt), msg.getSubject(), msg.getFrom()].join("\u0020"));
                });
                thread.moveToTrash();
            });
            // Prevents Google Apps Script timeouts.
            const timeDiff = new Date().getTime() - scriptStartDate.getTime()
            if (timeDiff > 5 * 60 * 1000) {
                return deleteLog;
            }
            response = GmailApp.search(mergeCondition, 0, MAX_SIZE);
        } while (response.length != 0);
    });
    return deleteLog;
}