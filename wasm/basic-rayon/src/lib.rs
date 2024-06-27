pub use wasm_bindgen_rayon::init_thread_pool;

use wasm_bindgen::prelude::wasm_bindgen;

use rayon::iter::IntoParallelRefIterator;
use rayon::iter::ParallelIterator;



#[wasm_bindgen]
pub fn sum(numbers: &[i32]) -> i32 {
    numbers.par_iter().sum()
}