type Status = "pending" | "resolved" | "rejected";
type Executor = (resolve: any, reject: any) => void;

function resolvePromise(promise2, x: MyPromise, resolve, reject) {
  let then;
  let thenCalledOrThrow = false;

  if (promise2 === x) {
    return reject(new TypeError("chaining cycle detected for promise"));
  }

  if (x instanceof MyPromise) {
    if (x.status === "pending") {
      x.then(function (value) {
        resolvePromise(promise2, value, resolve, reject);
      });
    } else {
      // 直接将它的只thenable
      x.then(resolve, reject);
    }
    return;
  }
  if ((x !== null && typeof x === "object") || typeof x === "function") {
    try {
      then = (x as any).then;
      if (typeof then === "function") {
        then.call(
          x,
          function resolve(value) {
            if (thenCalledOrThrow) return;
            thenCalledOrThrow = true;
            return resolvePromise(promise2, value, resolve, reject);
          },
          function reject(reason) {
            if (thenCalledOrThrow) return;
            thenCalledOrThrow = true;
            return reject(reason);
          }
        );
      } else {
        resolve(x);
      }
    } catch (error) {
      if (thenCalledOrThrow) return;
      thenCalledOrThrow = true;
      return reject(error);
    }
  } else {
    resolve(x);
  }
}

class MyPromise {
  status: Status = "pending";
  data: any = undefined;
  private onResolvedCallback: any[] = [];
  private onRejectedCallback: any[] = [];

  constructor(executor: Executor) {
    const self = this;
    function resolve(value: any) {
      setTimeout(() => {
        if (self.status === "pending") {
          self.status = "resolved";
          self.data = value;
          self.onResolvedCallback.forEach((item) => {
            item(value);
          });
        }
      }, 0);
    }
    function reject(reason: any) {
      setTimeout(() => {
        if (self.status === "rejected") {
          self.status = "rejected";
          self.data = reason;
          self.onRejectedCallback.forEach((item) => {
            item(reason);
          });
        }
      }, 0);
    }

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  then(onResolved?, onRejected?) {
    let self = this;
    let promise2;
    onResolved =
      typeof onResolved === "function"
        ? onResolved
        : function (value) {
            return value;
          };
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : function (reason) {
            throw reason;
          };
    if (this.status === "resolved") {
      return (promise2 = new MyPromise(function (resolve, reject) {
        setTimeout(() => {
          try {
            const x = onResolved(self.data);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0)
      }));
    }
    if (self.status === "rejected") {
      return (promise2 = new MyPromise(function (resolve, reject) {
        setTimeout(() => {
          try {
            const x = onRejected(self.data);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0)
      }));
    }
    if (self.status === "pending") {
      return (promise2 = new MyPromise(function (resolve, reject) {
        self.onResolvedCallback.push(function (value) {
          try {
            const x = onResolved(self.data);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
        self.onRejectedCallback.push(function (reason) {
          try {
            const x = onRejected(self.data);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      }));
    }
  }
  catch(onRejected?) {
    return this.then(null, onRejected);
  }
  finally(fn: Function) {
    return this.then(function(value) {
      setTimeout(fn);
      return value;
    }, function(reason) {
      setTimeout(fn);
      throw reason
    })
  }
  all(promiseList: MyPromise[]) {
    return new MyPromise(function (resolve, reject) {
      let resolvedCount = 0;
      let length = promiseList.length;
      let resolveValue = new Array(length);
      promiseList.forEach((promise, index) => {
        MyPromise.resolve(promise).then((value) => {
          resolvedCount++;
          resolveValue[index] = value;
          if (resolvedCount === length) {
            return resolve(resolveValue);
          }
        }, (reason) => {
          return reject(reason);
        })
      })
    })
  }
  race(promiseList: MyPromise[]) {
    return new MyPromise((resolve, reject) => {
      promiseList.forEach((promise, index) => {
        MyPromise.resolve(promise).then((value) => {
          return resolve(value);
        }, (reason) => {
          return reject(reason);
        })
      })
    })
  }
  static resolve(value) {
    let promise = new MyPromise(function(resolve, reject) {
      resolve(value);
    })
    return promise;
  }
  static reject(reason) {
    let promise = new MyPromise(function(resolve, reject) {
      reject(reason);
    })
    return promise;
  }
}

new MyPromise((resolve, reject) => {
  resolve(8);
}).then().catch().then((value) => {
  console.log(value);
})

