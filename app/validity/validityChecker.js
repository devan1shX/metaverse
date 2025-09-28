const JoinValidator = require("./JoinMessage.js/JoinValidator");

class ValidityChecks {
    ValidityJoinMessage(message){
        return JoinValidator(message);
    }
}
ValidityChecker = new ValidityChecks();
module.exports = ValidityChecker;