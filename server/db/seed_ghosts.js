import "dotenv/config";
import pool from "./pool.js";

// Solutions for all 15 problems
const SOLUTIONS = {
  1: { // Two Sum
    code: `function solve(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map[comp] !== undefined) return [map[comp], i];
    map[nums[i]] = i;
  }
}`,
    timeMs: 245000,
  },
  2: { // Best Time to Buy Stock
    code: `function solve(prices) {
  let minPrice = Infinity, maxProfit = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    maxProfit = Math.max(maxProfit, p - minPrice);
  }
  return maxProfit;
}`,
    timeMs: 198000,
  },
  3: { // Contains Duplicate
    code: `function solve(nums) {
  return new Set(nums).size !== nums.length;
}`,
    timeMs: 120000,
  },
  4: { // Product Except Self
    code: `function solve(nums) {
  const n = nums.length, res = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { res[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { res[i] *= suffix; suffix *= nums[i]; }
  return res;
}`,
    timeMs: 310000,
  },
  5: { // Maximum Subarray
    code: `function solve(nums) {
  let max = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    max = Math.max(max, cur);
  }
  return max;
}`,
    timeMs: 220000,
  },
  6: { // Valid Palindrome
    code: `function solve(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}`,
    timeMs: 175000,
  },
  7: { // Two Sum II Sorted
    code: `function solve(numbers, target) {
  let l = 0, r = numbers.length - 1;
  while (l < r) {
    const sum = numbers[l] + numbers[r];
    if (sum === target) return [l + 1, r + 1];
    if (sum < target) l++; else r--;
  }
}`,
    timeMs: 260000,
  },
  8: { // Three Sum
    code: `function solve(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i-1]) continue;
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) { res.push([nums[i], nums[l], nums[r]]); while (nums[l] === nums[l+1]) l++; while (nums[r] === nums[r-1]) r--; l++; r--; }
      else if (sum < 0) l++; else r--;
    }
  }
  return res;
}`,
    timeMs: 420000,
  },
  9: { // Container With Most Water
    code: `function solve(height) {
  let l = 0, r = height.length - 1, max = 0;
  while (l < r) {
    max = Math.max(max, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++; else r--;
  }
  return max;
}`,
    timeMs: 290000,
  },
  10: { // Trapping Rain Water
    code: `function solve(height) {
  let l = 0, r = height.length - 1, lMax = 0, rMax = 0, water = 0;
  while (l < r) {
    if (height[l] < height[r]) { lMax = Math.max(lMax, height[l]); water += lMax - height[l]; l++; }
    else { rMax = Math.max(rMax, height[r]); water += rMax - height[r]; r--; }
  }
  return water;
}`,
    timeMs: 380000,
  },
  11: { // Max Subarray of Size K
    code: `function solve(nums, k) {
  let sum = 0, max = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  max = sum;
  for (let i = k; i < nums.length; i++) {
    sum += nums[i] - nums[i - k];
    max = Math.max(max, sum);
  }
  return max;
}`,
    timeMs: 195000,
  },
  12: { // Longest Substring No Repeat
    code: `function solve(s) {
  const map = new Map();
  let left = 0, max = 0;
  for (let r = 0; r < s.length; r++) {
    if (map.has(s[r])) left = Math.max(left, map.get(s[r]) + 1);
    map.set(s[r], r);
    max = Math.max(max, r - left + 1);
  }
  return max;
}`,
    timeMs: 280000,
  },
  13: { // Min Window Substring
    code: `function solve(s, t) {
  const need = new Map(), window = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let have = 0, required = need.size, l = 0, res = "", minLen = Infinity;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    window.set(c, (window.get(c) || 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) have++;
    while (have === required) {
      if (r - l + 1 < minLen) { minLen = r - l + 1; res = s.slice(l, r + 1); }
      window.set(s[l], window.get(s[l]) - 1);
      if (need.has(s[l]) && window.get(s[l]) < need.get(s[l])) have--;
      l++;
    }
  }
  return res;
}`,
    timeMs: 520000,
  },
  14: { // Permutation in String
    code: `function solve(s, p) {
  const count = new Array(26).fill(0);
  for (const c of p) count[c.charCodeAt(0) - 97]++;
  const win = new Array(26).fill(0);
  const res = [];
  for (let i = 0; i < s.length; i++) {
    win[s.charCodeAt(i) - 97]++;
    if (i >= p.length) win[s.charCodeAt(i - p.length) - 97]--;
    if (win.join(',') === count.join(',')) res.push(i - p.length + 1);
  }
  return res;
}`,
    timeMs: 450000,
  },
  15: { // Sliding Window Maximum
    code: `function solve(nums, k) {
  const deque = [], res = [];
  for (let i = 0; i < nums.length; i++) {
    while (deque.length && deque[0] < i - k + 1) deque.shift();
    while (deque.length && nums[deque[deque.length-1]] < nums[i]) deque.pop();
    deque.push(i);
    if (i >= k - 1) res.push(nums[deque[0]]);
  }
  return res;
}`,
    timeMs: 390000,
  },
};

// Generate realistic keystrokes from code
function generateKeystrokes(code, totalTimeMs) {
  const keystrokes = [];
  const avgDelay = totalTimeMs / Math.max(code.length, 1);
  let ts = 500; // start after 500ms
  for (const char of code) {
    const jitter = (Math.random() - 0.5) * avgDelay * 0.8;
    ts += Math.max(50, avgDelay + jitter);
    keystrokes.push({ char, timestamp_ms: Math.round(ts) });
  }
  return keystrokes;
}

async function seedGhosts() {
  const client = await pool.connect();
  try {
    // Get all levels ordered by order_num
    const levelsResult = await client.query(
      `SELECT id, order_num FROM levels ORDER BY order_num ASC`
    );
    const levels = levelsResult.rows;

    if (levels.length === 0) {
      console.log("❌ No levels found. Run seed_problems.js first.");
      process.exit(1);
    }

    // Get or create a ghost user
    let ghostUser = await client.query(
      `SELECT id FROM users WHERE username = 'GhostPlayer001'`
    );

    if (ghostUser.rows.length === 0) {
      ghostUser = await client.query(
        `INSERT INTO users (username, email, password_hash, credits, elo)
         VALUES ('GhostPlayer001', 'ghost@codearena.io', 'ghost_no_login', 5000, 1200)
         RETURNING id`
      );
      console.log("✓ Created ghost user GhostPlayer001");
    }

    const ghostUserId = ghostUser.rows[0].id;

    // Clear existing ghost replays for this user
    await client.query(
      `DELETE FROM ghost_replays WHERE user_id = $1`,
      [ghostUserId]
    );

    await client.query("BEGIN");

    for (const level of levels) {
      const sol = SOLUTIONS[level.order_num];
      if (!sol) {
        console.log(`  ⚠ No solution for level ${level.order_num}, skipping`);
        continue;
      }

      const keystrokes = generateKeystrokes(sol.code, sol.timeMs);

      await client.query(
        `INSERT INTO ghost_replays (level_id, user_id, keystrokes, total_time_ms, solution_code)
         VALUES ($1, $2, $3::jsonb, $4, $5)`,
        [level.id, ghostUserId, JSON.stringify(keystrokes), sol.timeMs, sol.code]
      );

      console.log(`  ✓ Ghost replay seeded for level ${level.order_num}`);
    }

    await client.query("COMMIT");
    console.log(`\n✅ Seeded ${levels.length} ghost replays. New users always have an opponent!\n`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Ghost seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedGhosts();
