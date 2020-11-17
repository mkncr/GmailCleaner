function deleteMail() {
  
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
   
  function createDateStr(dt){
    return Utilities.formatDate(dt,Session.getTimeZone(),"yyyy-MM-dd HH:mm:ss");
  }
  
  var deleteLog = new Map();
  const MAX_SIZE = 500;
  searchCondition.forEach(function(elem){
    const mergeCondition = baseCondition.concat(elem).join("\u0020");
    
    var response = GmailApp.search(mergeCondition, 0, MAX_SIZE);
    do{
      response.forEach(function (thread) {
        thread.getMessages().forEach(function (msg){
          const dt = msg.getDate();
          deleteLog.set(dt,[createDateStr(dt), msg.getSubject(), msg.getFrom()].join("\u0020"));
        });
        thread.moveToTrash();
      });
      response = GmailApp.search(mergeCondition, 0, MAX_SIZE);
    }while(response.length!=0);
  });
  
  if(deleteLog.size){
    const sortedLog = new Map([...deleteLog.entries()].sort((a, b) => a[0] - b[0]));
    const address = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail(address, 'GmailCleaner Report', Array.from(sortedLog.values()).join("\n"));
  };
}
