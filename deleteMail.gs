function gmailCleanerMain() {
    const scriptStartDate = new Date();
    const funcName = arguments.callee.name;

    // Please fill in the conditions of the email to be deleted.
    const searchCondition = [
        'category:social',
        'subject:GmailCleaner Report'
    ]

    // Emails older than the specified period will be deleted.
    const delayDays = "1m";

    // This condition always applies.
    const baseCondition = [
        'older_than:' + delayDays,
        '-is:starred',
        'is:read'
    ]

    deleteTrigger(funcName);
    const deleteLog = cleaner(scriptStartDate, searchCondition, baseCondition, funcName);

    if (deleteLog.size) {
        const sortedLog = new Map([...deleteLog.entries()].sort((a, b) => a[0] - b[0]));
        const address = Session.getEffectiveUser().getEmail();
        MailApp.sendEmail(address, 'GmailCleaner Report', Array.from(sortedLog.values()).join("\n"));
    }

    // Set the default trigger.
    setTrigger(funcName);
}


function deleteTrigger(funcName) {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
        if (trigger.getHandlerFunction() == funcName) {
            ScriptApp.deleteTrigger(trigger);
        }
    });
}


function setTrigger(funcName, durationSec = null) {
    const dt = new Date();
    if (durationSec === null) {
        dt.setMonth(dt.getMonth() + 1);
        dt.setDate(1);
        dt.setHours(0);
        dt.setMinutes(0);
        dt.setSeconds(0);
        dt.setMilliseconds(0);
    } else {
        dt.setSeconds(dt.getSeconds() + durationSec);
    }
    ScriptApp.newTrigger(funcName).timeBased().at(dt).create();
}



function createDateStr(dt = new Date(), format = "yyyy-MM-dd HH:mm:ss") {
    return Utilities.formatDate(dt, Session.getTimeZone(), format);
}


function outputLog(addString, fileName) {
    const folder = DriveApp.getRootFolder();
    const files = folder.getFilesByName(fileName);
    var exists = false;
    var file
    while (files.hasNext()) {
        file = files.next();
        if (fileName == file.getName()) {
            exists = true;
            break;
        }
    }
    if (!exists) {
        file = folder.createFile(fileName, "");
    }
    const existingString = file.getBlob().getDataAsString();
    file.setContent(existingString + [addString, '\n'].join(""));
}


function cleaner(scriptStartDate, searchCondition, baseCondition, funcName, batch_size = 500) {
    const logFileName = [createDateStr(scriptStartDate, "yyyyMMdd_HHmmss"), '_', funcName, '.log'].join("")
    const threshold = 4 * 60 * 1000
    var deleteLog = new Map();
    for (var i = 0; i < searchCondition.length; i++) {
        const elem = searchCondition[i];
        const mergeCondition = baseCondition.concat(elem).join("\u0020");

        var response = GmailApp.search(mergeCondition, 0, batch_size);
        do {
            for (var j = 0; j < response.length; j++) {
                const thread = response[j]
                thread.getMessages().forEach(function(msg) {
                    const dt = msg.getDate();
                    const log = [createDateStr(dt), msg.getSubject(), msg.getFrom()].join("\u0020")
                    deleteLog.set(dt, log);
                    outputLog(log, logFileName);
                });
                thread.moveToTrash();
            }
            // Prevents Google Apps Script timeouts.
            const timeDiff = new Date().getTime() - scriptStartDate.getTime();
            if (timeDiff > threshold) {
                setTrigger(funcName, 60);
                return deleteLog;
            }
            response = GmailApp.search(mergeCondition, 0, batch_size);
        } while (response.length != 0);
    }
    return deleteLog;
}