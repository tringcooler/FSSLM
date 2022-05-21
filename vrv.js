const VRV = (() => {
    
    const [
        
        PR_RADITER,
        PL_RADIXES,
        MTD_GET_RADIX,
        
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    class c_variable_radix_vector {
        
        constructor(radixes_iter) {
            this[PR_RADITER] = radixes_iter[Symbol.iterator]();
            this[PL_RADIXES] = [1];
        }
        
        [MTD_GET_RADIX](n) {
            let riter = this[PR_RADITER];
            let rads = this[PL_RADIXES];
            let rlen;
            while((rlen = rads.length) <= n) {
                let {value, done} = riter.next();
                if(done) {
                    throw Error('radixes overtake');
                }
                if(rlen > 0) {
                    value *= rads[rlen - 1];
                }
                rads.push(value);
            }
            return rads[n];
        }
        
        vec2vid(vec) {
            let vlen = vec.length;
            let vid = 0;
            for(let i = 0; i < vlen; i++) {
                let v = vec[vlen - 1 - i];
                let r = this[MTD_GET_RADIX](i);
                if(v >= this[MTD_GET_RADIX](i + 1) / r) {
                    throw Error(`bit ${i} overset`);
                }
                vid += v * r;
            }
            return vid;
        }
        
        vid2vec(vid) {
            let mxi = 0;
            while(vid >= this[MTD_GET_RADIX](mxi)) {
                mxi ++;
            }
            let vec = [];
            for(let i = mxi - 1; i >= 0; i--) {
                let r = this[MTD_GET_RADIX](i);
                let v = Math.floor(vid / r);
                vid -= v * r;
                vec.push(v);
            }
            return vec;
        }
        
    }
    
    return c_variable_radix_vector;
    
})();
