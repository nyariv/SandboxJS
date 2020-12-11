export const error = new Error();
export const tests = [
    {
      code: "`${type}`",
      evalExpect: "eval",
      safeExpect: "Sandbox"
    },
    {
      code: "test2",
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: "a.b.c",
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: "1+1",
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: "[test2, 2]",
      evalExpect: [1, 2],
      safeExpect: [1, 2]
    },
    {
      code: `{"aa": test[0](), b: test2 * 3}`,
      evalExpect: {"aa": 1, b: 3},
      safeExpect: {"aa": 1, b: 3}
    },
    {
      code: `test.b = test2 - test[0]() - test[0]()`,
      evalExpect: -1,
      safeExpect: -1
    },
    {
      code: `1 * 2 + 3 * (4 + 5) * 6`,
      evalExpect: 164,
      safeExpect: 164
    },
    {
      code: `(test2 * (2 + 3 * (4 + 5))) * 6`,
      evalExpect: 174,
      safeExpect: 174
    },
    {
      code: `1+2*4/5-6+7/8 % 9+10-11-12/13*14`,
      evalExpect: -16.448076923076925,
      safeExpect: -16.448076923076925
    },
    {
      code: `2.2204460492503130808472633361816E-16`,
      evalExpect: 2.2204460492503130808472633361816E-16,
      safeExpect: 2.2204460492503130808472633361816E-16
    },
    {
      code: `test[test2] ? true : false ? 'not ok' : 'ok'`,
      evalExpect: 'ok',
      safeExpect: 'ok'
    },
    {
      code: `"test2"`,
      evalExpect: "test2",
      safeExpect: "test2"
    },
    {
      code: "`test2 is ${`also ${test2}`}`",
      evalExpect: "test2 is also 1",
      safeExpect: "test2 is also 1"
    },
    {
      code: `"\\\\"`,
      evalExpect: "\\",
      safeExpect: "\\"
    },
    {
      code: `{"\\\\":"\\\\"}`,
      evalExpect: {"\\":"\\"},
      safeExpect: {"\\":"\\"}
    },
    {
      code: "`\\\\$$\\${${`\\\\\\`${'ok'}`}\\\\}`",
      evalExpect: "\\$$${\\`ok\\}",
      safeExpect: "\\$$${\\`ok\\}"
    },
    {
      code: `["\\\\", "\\xd9", "\\n", "\\r", "\\u2028", "\\u2029"]`,
      evalExpect: ["\\", "\xd9", "\n", "\r", "\u2028", "\u2029"],
      safeExpect: ["\\", "\xd9", "\n", "\r", "\u2028", "\u2029"]
    },
    {
      code: "bypassed=1",
      evalExpect: error,
      safeExpect: error,
    },
    {
      code: "`${`${bypassed=1}`}`",
      evalExpect: error,
      safeExpect: error
    },
    {
      code: `[].filter.constructor("return 'ok'")()`,
      evalExpect: 'ok',
      safeExpect: 'ok',
    },
    {
      code: `[].filter.constructor("return bypassed")()`,
      evalExpect: false,
      safeExpect: error,
    },
    {
      code: `[].filter.constructor("return bypassed=1")()`,
      evalExpect: 'bypassed',
      safeExpect: error,
    },
    {
      code: `[].filter.constructor("return this.bypassed=1")()`,
      evalExpect: 'bypassed',
      safeExpect: 1,
    },
    {
      code: `[].filter.constructor("return this.constructor.name")()`,
      evalExpect: 'Window',
      safeExpect: 'SandboxGlobal',
    },
    {
      code: `[+!+[]]+[]`,
      evalExpect: "1",
      safeExpect:  "1"
    },
    {
      code: `[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]][([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]]((+(+!+[]+[+!+[]]))[(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(+![]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(+![]+[![]]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[!+[]+!+[]+[+[]]]](!+[]+!+[]+[+[]])+(+[![]]+[+(+!+[]+(!+[]+[])[!+[]+!+[]+!+[]]+[+!+[]]+[+[]]+[+[]]+[+[]])])[+!+[]+[+[]]]+(+(!+[]+!+[]+[+!+[]]+[+!+[]]))[(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(+![]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(+![]+[![]]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[!+[]+!+[]+[+[]]]](!+[]+!+[]+!+[]+[+!+[]])[+!+[]]+(![]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[!+[]+!+[]+!+[]]+([][[]]+[])[!+[]+!+[]]+([]+[])[(![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(!![]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]]()[+!+[]+[+!+[]]]+[+!+[]]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]][([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]]((!![]+[])[+!+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+([][[]]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+!+[]]+(+[![]]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+!+[]]]+([][[]]+[])[+[]]+([][[]]+[])[+!+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(![]+[])[+!+[]]+(+(!+[]+!+[]+[+!+[]]+[+!+[]]))[(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(+![]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(+![]+[![]]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[!+[]+!+[]+[+[]]]](!+[]+!+[]+!+[]+[+!+[]])[+!+[]]+(!![]+[])[!+[]+!+[]+!+[]])()([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]][([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]]((!![]+[])[+!+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+([][[]]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+!+[]]+(+[![]]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+!+[]]]+(!![]+[])[!+[]+!+[]+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(![]+[])[+!+[]]+(+(!+[]+!+[]+[+!+[]]+[+!+[]]))[(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(+![]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(+![]+[![]]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[!+[]+!+[]+[+[]]]](!+[]+!+[]+!+[]+[+!+[]])[+!+[]]+(!![]+[])[!+[]+!+[]+!+[]])()(([]+[])[([![]]+[][[]])[+!+[]+[+[]]]+(!![]+[])[+[]]+(![]+[])[+!+[]]+(![]+[])[!+[]+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(![]+[])[!+[]+!+[]+!+[]]]()[+[]])[+[]]+[!+[]+!+[]+!+[]]+(+(+!+[]+[+!+[]]))[(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(+![]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([![]]+[][[]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(+![]+[![]]+([]+[])[([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+([][[]]+[])[+!+[]]+(![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[+!+[]]+([][[]]+[])[+[]]+([][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+[]]+(!![]+[])[!+[]+!+[]+!+[]]+(!![]+[])[+!+[]]])[+!+[]+[+[]]]+(!![]+[])[+!+[]]])[!+[]+!+[]+[+[]]]](!+[]+!+[]+[+[]])))()`,
      evalExpect: 'bypassed',
      safeExpect: error,
      ignoreTime: true
    },
    {
      code: `Function.name`,
      evalExpect: 'Function',
      safeExpect: 'SandboxFunction'
    },
    {
      code: `[].constructor.constructor.constructor.name`,
      evalExpect: 'Function',
      safeExpect: 'SandboxFunction'
    },
    {
      code: `[].anything = 1`,
      evalExpect: 1,
      safeExpect: 1,
    },
    {
      code: `[].filter = 1`,
      evalExpect: 1,
      safeExpect: error,
    },
    {
      code: `[].constructor.prototype.flatMap = 1`,
      evalExpect: 1,
      safeExpect: error,
    },
    {
      code: `[].__proto__.flatMap = 1`,
      evalExpect: 1,
      safeExpect: error,
    },
    {
      code: `Object.anything = 1`,
      evalExpect: error,
      safeExpect: error,
    },
    {
      code: `Object.freeze = 1`,
      evalExpect: error,
      safeExpect: error,
    },
    {
      code: `{}.constructor.anything = 1`,
      evalExpect: 1,
      safeExpect: error
    },
    {
      code: `{}.constructor.freeze = 1`,
      evalExpect: 1,
      safeExpect: error
    },
    {
      code: `{}.constructor.constructor.anything = 1`,
      evalExpect: 1,
      safeExpect: error
    },
    {
      code: `(() => {}).anything = 1`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `Object.name`,
      evalExpect: error,
      safeExpect: 'Object' 
    },
    {
      code: `Object.keys({a:1})`,
      evalExpect: ['a'],
      safeExpect: ['a']
    },
    {
      code: `Object.assign(Object, {}) || 'ok'`,
      evalExpect: error,
      safeExpect: error
    },
    {
      code: `({}).__defineGetter__('a', () => 1 ) || 'ok'`,
      evalExpect: error,
      safeExpect: error 
    },
    {
      code: `!test2`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `!!test2`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2++`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `++test2`,
      evalExpect: 3,
      safeExpect: 3
    },
    {
      code: `test2 = 1`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `test2 += 1`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `test2 -= 1`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `test2 *= 2`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `test2 /= 2`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `~test2`,
      evalExpect: -2,
      safeExpect: -2
    },
    {
      code: `test2 **= 0`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `test2 %= 1`,
      evalExpect: 0,
      safeExpect: 0
    },
    {
      code: `test2 ^= 1`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `test2 &= 3`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `test2 |= 2`,
      evalExpect: 3,
      safeExpect: 3
    },
    {
      code: `test2 == "3"`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2 === "3"`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `test2 != "3"`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `test2 !== "3"`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2 < 3`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `test2 > 3`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `test2 >= 3`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2 <= 3`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2 && true`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2 !== "3" && false`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `true && true || false`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `true || true && false`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `1 && 2 == 1`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `1 + 2 === 1 + 2 === 1 && 2`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `true === 1 && 2`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `-1 < 1 && 2 > 1`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `test2 || false`,
      evalExpect: 3,
      safeExpect: 3
    },
    {
      code: `test2 & 1`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `test2 | 4`,
      evalExpect: 7,
      safeExpect: 7
    },
    {
      code: `+"1"`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `-"1"`,
      evalExpect: -1,
      safeExpect: -1
    },
    {
      code: `typeof "1"`,
      evalExpect: "string",
      safeExpect: "string"
    },
    {
      code: `{} instanceof Object`,
      evalExpect: error,
      safeExpect: true
    },
    {
      code: `var i = 1; return i + 1`,
      evalExpect: error,
      safeExpect: 2
    },
    {
      code: `let j = 1; return j + 1`,
      evalExpect: error,
      safeExpect: 2
    },
    {
      code: `const k = 1; return k + 1`,
      evalExpect: error,
      safeExpect: 2
    },
    {
      code: `const l = 1; return l = 2`,
      evalExpect: error,
      safeExpect: error
    },
    {
      code: `[1, ...[2, [test2, 4]], 5]`,
      evalExpect: [1, 2, [3, 4], 5],
      safeExpect: [1, 2, [3, 4], 5]
    },
    {
      code: `{a: 1, ...{b: 2, c: {d: test2}}, e: 5}`,
      evalExpect: {a: 1, b: 2, c: {d: 3}, e: 5},
      safeExpect: {a: 1, b: 2, c: {d: 3}, e: 5}
    },
    {
      code: `'a' in {a: 1}`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `1,2`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `test2 = 1,(() => 2)(),test2`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `delete 1`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `let a = {b: 1}; return delete a.b`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `let b = {a: 1}; return delete b`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `((a) => {return a + 1})(1)`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `(() => '1' + (() => '22')())()`,
      evalExpect: '122',
      safeExpect: '122'
    },
    {
      code: `(a => a + 1)(1)`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `function f(a) { return a + 1 } return f(2);`,
      evalExpect: 3,
      safeExpect: 3
    },
    {
      code: `(function () { return 1 })()`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `let list = [0, 1]; return list.sort((a, b) => (a < b) ? 1 : -1)`,
      evalExpect: [1, 0],
      safeExpect: [1, 0]
    },
    {
      code: `let y = {a: 1, b(x) {return this.a + x}}; return y.b(2)`,
      evalExpect: 3,
      safeExpect: 3
    },
    {
      code: `let y = {a: '2', b() {return this.a = '1'}}; y.b(); return y.a`,
      evalExpect: '1',
      safeExpect: '1'
    },
    {
      code: `[0,1].filter((...args) => args[1])`,
      evalExpect: [1],
      safeExpect: [1]
    },
    {
      code: `Math.pow(...[2, 2])`,
      evalExpect: 4,
      safeExpect: 4
    },
    {
      code: `let x; for(let i = 0; i < 2; i++){ x = i }; return x;`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `let x; for(let i = 0; i < 2; i++){ x = i; break; }; return x;`,
      evalExpect: 0,
      safeExpect: 0
    },
    {
      code: `let x; for(let i = 0; i < 2; i++){ x = i; continue; x++ }; return x;`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `break;`,
      evalExpect: error,
      safeExpect: error
    },
    {
      code: `continue;`,
      evalExpect: error,
      safeExpect: error
    },
    {
      code: `let x = 2; while(--x){ }; return x;`,
      evalExpect: 0,
      safeExpect: 0
    },
    {
      code: `let x = 1; do {x++} while(x < 1); return x;`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `for(let i of [1,2]){ return i };`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `for(let i in [1,2]){ return i };`,
      evalExpect: "0",
      safeExpect: "0"
    },
    {
      code: `const a = () => {return 1}; const b = () => {return 2}; return (() => a() + b())()`,
      evalExpect: 3,
      safeExpect: 3
    },
    // {
    //   code: `let i = 1; {let j = 1; i += j; console.log(i)}; return i`,
    //   evalExpect: 2,
    //   safeExpect: 2
    // },
    {
      code: `if (true) { return true; } else return false`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `if (false) return true; else if (false) {return true} else return false`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `if (false) { return true; } else return false`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `if (false) return true; return false`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `if (true) {
        if (false)
          if (true)
            if (false)
              return 1
            else if (true)
              return 2
            else
              return 3
          else
            return 4
        else if (true)
          if (false)
            return 5
          else if (true)
            return 6
          else
            return 7
        else
          return 8
      } else if (true)
        return 9;`,
      evalExpect: 6,
      safeExpect: 6
    },
    {
      code: `try {a.x.a} catch {return 1}; return 2`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `void 2 == '2'`,
      evalExpect: false,
      safeExpect: false
    },
    {
      code: `void (2 == '2')`,
      evalExpect: undefined,
      safeExpect: undefined
    },
    {
      code: `(async () => 1)()`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `(async () => await 1)()`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `(async () => await (async () => 1)())()`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `new Date(0).toISOString()`,
      evalExpect: "1970-01-01T00:00:00.000Z",
      safeExpect: "1970-01-01T00:00:00.000Z"
    },
    {
      code: `/* 2 */ 1`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `1 // 2`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `/* 2 */ (() => /* 3 */ 1)() // 4`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `/a/.test('a')`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `/a/i.test('A')`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `let reg = /a/g; reg.exec('aaa'); return reg.exec('aaa').index`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `let a = 1; let b = 2; switch(1) {case a: b = 1; case b: return b; default: return 0;}`,
      evalExpect: 1,
      safeExpect: 1
    },
    {
      code: `let b = 1; switch(1) {case 1: b = 2; break; case 2: b = 3; default: b = 4}; return b`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `let b = 1; switch(3) {case 1: b = 2; break; case 2: b = 3; default: b = 4}; return b`,
      evalExpect: 4,
      safeExpect: 4
    },
    {
      code: `let b = 1; switch(1) {case 1:b = 2; case 2: b = 3; default: b = 4}; return b`,
      evalExpect: 4,
      safeExpect: 4
    },
    {
      code: `({})?.a`,
      evalExpect: undefined,
      safeExpect: undefined
    },
    {
      code: `({}).a?.toSring() + ({}).b?.toString()`,
      evalExpect: null,
      safeExpect: null
    },
    {
      code: `({}).a?.toString().toString()`,
      evalExpect: undefined,
      safeExpect: undefined
    },
    {
      code: `({})['b']?.toString() === undefined`,
      evalExpect: true,
      safeExpect: true
    },
    {
      code: `({}).c?.()() ? 1 : 2`,
      evalExpect: 2,
      safeExpect: 2
    },
    {
      code: `(1n + 0x1n).toString()`,
      evalExpect: "2",
      safeExpect: "2"
    },
    {
      code: `function LinkedListNode(e){this.value=e,this.next=null}function reverse(e){let n,t,r=e;for(;r;)t=r.next,r.next=n,n=r,r=t;return n}function reverse(e){if(!e||!e.next)return e;let n=reverse(e.next);return e.next.next=e,e.next=void 0,n} let l1 = new LinkedListNode(1); l1.next = new LinkedListNode(2); return reverse(l1);`,
      evalExpect: {"value":2,"next":{"value":1}},
      safeExpect: {"value":2,"next":{"value":1}}
    },
    // {
    //   code: 'lodash.map(Array(1000000).fill(0), () => 1).pop()',
    //   evalExpect: 1,
    //   safeExpect: 1
    // },
    // {
    //   code: 'let c = 0; for (let i = 0; i < 1000000; i++) {c++} return c',
    //   evalExpect: 1000000,
    //   safeExpect: 1000000
    // },
];
