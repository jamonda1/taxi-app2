var express = require('express');
var router = express.Router();

const db = require('../database/db_connect');
// const { use } = require('.');
const admin = require('firebase-admin');
const { response } = require('../app');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});

const updateFcm = (fcmToken, table, idColName, id) => {
    const querystr = `update ${table} set fcm_token = "${fcmToken}" where ${idColName} = "${id}"`;
    console.log('>> updateFcm / querystr = ' + querystr);

    db.query(querystr, function (err, rows, fields) {
        if (err) {
            console.log('register / err : ' + JSON.stringify(err));
        }
    });
};

const sendPushToAlldriver = () => {
    let querystr = 'select fcm_token from tb_driver';

    console.log('>> querystr = ' + querystr);

    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            for (rows of rows) {
                console.log('allDriver - fcm_token = ' + rows.fcm_token);
                if (rows.fcm_token) {
                    sendFcm(rows.fcm_token, '배차 요청이 있습니다.');
                }
            }
        }
    });
};

const sendPushToUser = (userId) => {
    let querystr = `select fcm_token from tb_user where user_id = "${userId}"`;
    console.log('>> push user - querystr = ' + querystr);
    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('>> push user - rows = ' + JSON.stringify(rows));
            if (Object.keys(rows).length > 0 && rows[0].fcm_token) {
                sendFcm(rows[0].fcm_token, '배차가 완료되었습니다.');
            } else {
                console.log('push 전송 실패');
            }
        } else {
            console.log('>> push user -err : ' + err);
        }
    });
};

router.get('/taxi/test', function (req, res, next) {
    db.query('select * from tb_user', (err, rows, fields) => {
        if (!err) {
            console.log('test / rows = ', JSON.stringify(rows));
            res.json([{ code: 0, data: rows }]);
        } else {
            console.log('test / err: ' + err);
            res.json([{ code: 1, data: err }]);
        }
    });
});

router.post('/taxi/login', function (req, res, next) {
    console.log('login / req.body' + JSON.stringify(req.body));

    let userId = req.body.userId;
    let userPw = req.body.userPw;
    let fcmToken = req.body.fcmToken || '';

    let querystr = `select * from tb_user where user_id = "${userId}" and user_pw = "${userPw}"`;
    console.log('login / querystr = ' + querystr);
    db.query(querystr, (err, rows, fields) => {
        if (!err) {
            console.log('login / rows = ' + JSON.stringify(rows));
            let len = Object.keys(rows).length;
            console.log('login / length = ' + len);
            let code = len == 0 ? 1 : 0;
            let message = len == 0 ? '아이디 또는 비밀번호가 잘못 입력되었습니다' : '로그인 성공';

            if (code == 0) {
                updateFcm(fcmToken, 'tb_user', 'user_id', userId);
            }

            res.json([{ code: code, message: message }]);
        } else {
            console.log('login / err : ' + err);
            res.json([{ code: 1, message: err }]);
        }
    });
});

router.post('/taxi/register', function (req, res) {
    console.log('register / req.body ' + JSON.stringify(req.body));

    let userId = req.body.userId;
    let userPw = req.body.userPw;
    let fcmToken = req.body.fcmToken || '';

    console.log('register / userId = ' + userId);
    console.log('register / userPw = ' + userPw);

    if (!(userId && userPw)) {
        res.json([{ code: 1, message: '아이디 또는 비밀번호를 입력해주세요.' }]);
        return;
    }

    let querystr = `insert into tb_user values ("${userId}", "${userPw}", "${fcmToken}")`;
    console.log('register . querystr = ' + querystr);

    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('register / rows = ' + JSON.stringify(rows));
            res.json([{ code: 0, message: '회원가입 성공' }]);
        } else {
            console.log('register / err : ' + JSON.stringify(err));
            if (err.code == 'ER_DUP_ENTRY') {
                res.json([{ code: 2, message: '이미 사용중인 ID입니다.' }]);
            } else {
                res.json([{ code: 3, message: '알 수 없는 오류가 발생했습니다.', data: err }]);
            }
        }
    });
});

router.post('/taxi/list', function (req, res) {
    console.log('list / req.body ' + JSON.stringify(req.body));
    let userId = req.body.userId;
    console.log('list / userId = ' + userId);

    let querystr = `select * from tb_call where user_id = "${userId}" order by id desc`;
    console.log('list / querystr = ' + querystr);
    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('list / rows = ' + JSON.stringify(rows));
            let code = 0;

            rows = rows.map((row) => {
                const requestTime = new Date(row.request_time);
                const today = new Date();
                const isToday = requestTime.toDateString() === today.toDateString();

                const formattedDate = requestTime.toISOString().split('T')[0];
                const formattedTime = requestTime.toTimeString().split(' ')[0].slice(0, 5);

                row.formatted_time = isToday ? formattedTime : formattedDate;

                return row;
            });

            res.json([{ code: code, message: '택시 호출 목록 호출 성공', data: rows }]);
        } else {
            console.log('err : ' + err);
            res.json([{ code: 1, message: '알 수 없는 오류가 발생했습니다.', data: err }]);
        }
    });
});

router.post('/taxi/call', function (req, res) {
    console.log('/taxi/call / req.body ' + JSON.stringify(req.body));

    let userId = req.body.userId;
    let startAddr = req.body.startAddr;
    let startLat = req.body.startLat;
    let startLng = req.body.startLng;
    let endAddr = req.body.endAddr;
    let endLat = req.body.endLat;
    let endLng = req.body.endLng;

    if (!(userId && startAddr && startLat && startLng && endAddr && endLat && endLng)) {
        // 하나라도 빠졌다면
        res.json([{ code: 1, message: '출발지 또는 도착지 정보가 없습니다.' }]);
        return;
    }

    let querystr = `insert into tb_call values(null, "${userId}", "${startLat}", "${startLng}", "${startAddr}",
    "${endLat}", "${endLng}", "${endAddr}", "REQ", "", CURRENT_TIMESTAMP)`;

    console.log('call / querystr = ' + querystr);

    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('call / rows = ' + JSON.stringify(rows));

            sendPushToAlldriver();

            res.json([{ code: 0, message: '택시 호출이 완료되었습니다.' }]);
        } else {
            console.log('call / err : ' + JSON.stringify(err));
            res.json([{ code: 2, message: '택시 호출이 실패했습니다.', data: err }]);
        }
    });
});

router.post('/driver/register', function (req, res) {
    console.log('driver-register / req.body ' + JSON.stringify(req.body));

    let userId = req.body.userId;
    let userPw = req.body.userPw;
    let fcmToken = req.body.fcmToken || '';

    console.log('register / userId = ' + userId);
    console.log('register / userPw = ' + userPw);

    if (!(userId && userPw)) {
        res.json([{ code: 1, message: '아이디나 비밀번호가 없습니다.' }]);
        return;
    }

    let querystr = `insert into tb_driver values("${userId}", "${userPw}", "${fcmToken}")`;
    console.log('driver-register . querystr = ' + querystr);

    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('driver-register / rows = ' + JSON.stringify(rows));
            res.json([{ code: 0, message: '회원가입이 완려되었습니다.' }]);
        } else {
            console.log('driver-register / err : ' + JSON.stringify(err));
            if (err.code == 'ER_DUP_ENTRY') {
                res.json([{ code: 2, message: '이미 등록된 ID입니다.' }]);
            } else {
                res.json([{ code: 3, message: '알 수 없는 오류가 발생했습니다.', data: err }]);
            }
        }
    });
});

router.post('/driver/login', function (req, res) {
    console.log('driver-login / req.body ' + JSON.stringify(req.body));

    let userId = req.body.userId;
    let userPw = req.body.userPw;
    let fcmToken = req.body.fcmToken || '';

    let querystr = `select * from tb_driver where driver_id = "${userId}" and driver_pw = "${userPw}"`;
    console.log('driver-login / querystr = ' + querystr);
    db.query(querystr, (err, rows, fields) => {
        if (!err) {
            console.log('driver-login / rows = ' + JSON.stringify(rows));
            let len = Object.keys(rows).length;
            console.log('driver-login / len = ' + len);
            let code = len == 0 ? 1 : 0;
            let message = len == 0 ? '아이디 또는 비밀번호가 잘못 입력되었습니다.' : '로그인 성공';

            if (code == 0) {
                updateFcm(fcmToken, 'tb_driver', 'driver_id', userId);
            }

            res.json([{ code: code, message: message }]);
        } else {
            console.log('driver-login / err : ' + err);
            res.json([{ code: 1, message: err }]);
        }
    });
});

router.post('/driver/list', function (req, res) {
    console.log('driver-list / req.body ' + JSON.stringify(req.body));

    let userId = req.body.userId;

    console.log('driver-list / userId = ' + userId);

    let querystr = `select * from tb_call where driver_id = "${userId}"
                    or call_state = "REQ" order by id desc`;

    console.log('driver-list / querystr = ' + querystr);
    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('driver-list / rows = ' + JSON.stringify(rows));
            let code = 0;

            rows = rows.map((row) => {
                const requestTime = new Date(row.request_time);
                const today = new Date();
                const isToday = requestTime.toDateString() === today.toDateString();

                const formattedDate = requestTime.toISOString().split('T')[0];
                const formattedTime = requestTime.toTimeString().split(' ')[0].slice(0, 5);

                row.formatted_time = isToday ? formattedTime : formattedDate;

                return row;
            });

            res.json([{ code: code, message: '택시 호출 목록 호출 성공', data: rows }]);
        } else {
            console.log('driver-list / err : ' + err);
            res.json([{ code: 1, message: '알 수 없는 오류가 발생했습니다.', data: err }]);
        }
    });
});

router.post('/driver/accept', function (req, res) {
    console.log('driver-acceopt / req.body ' + JSON.stringify(req.body));

    let callId = req.body.callId;
    let driverId = req.body.driverId;
    let userId = req.body.userId;

    console.log('driver-accept / callId, driverId = ' + callId + ', ' + driverId);

    if (!(callId && driverId)) {
        res.json([{ code: 1, message: 'callId 또는 driverId가 없습니다' }]);
        return;
    }
    let querystr = `update tb_call set driver_id = "${driverId}", call_state = "RES" where id = "${callId}"`;
    console.log('driver-accept / querystr = ' + querystr);
    db.query(querystr, function (err, rows, fields) {
        if (!err) {
            console.log('driver-accept / rows = ' + JSON.stringify(rows));
            if (rows.affectedRows > 0) {
                sendPushToUser(userId);
                res.json([{ code: 0, messgae: '배차가 완료되었습니다.' }]);
            } else {
                res.json([{ code: 2, message: '이미 완료되었거나 존재하지 않는 call입니다.' }]);
            }
        } else {
            console.log('driver-accept / err : ' + JSON.stringify(err));
            res.json([{ code: 3, message: '알 수 없는 오류가 발생했습니다.', data: err }]);
        }
    });
});

router.post('/push/test', function (req, res, next) {
    console.log('push-test / req.body ' + JSON.stringify(req.body));

    let fcmToken = req.body.fcmToken;
    let message = req.body.message;

    sendFcm(fcmToken, message);

    res.json([{ code: 0, message: '푸쉬 테스트' }]);
});

const sendFcm = (fcmToken, msg) => {
    const message = { notification: { title: '알림', body: msg }, token: fcmToken };

    admin
        .messaging()
        .send(message)
        .then((response) => {
            console.log('--- push 성공');
        })
        .catch((error) => {
            console.log('--- push 에러 / ' + JSON.stringify(error));
        });
};

module.exports = router;
