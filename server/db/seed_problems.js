import "dotenv/config";
import pool from "./pool.js";

const problems = [
  // ─── ARRAYS (5) ───────────────────────────────────────────────────────────
  {
    topic: "Arrays",
    sub_topic: "Hashing",
    difficulty: "easy",
    order_num: 1,
    problem_statement: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers that add up to \`target\`. You may assume each input has exactly one solution, and you may not use the same element twice.`,
    examples: [
      {
        args: [[2, 7, 11, 15], 9],
        expected: [0, 1],
        explanation: "nums[0] + nums[1] = 2 + 7 = 9",
      },
      {
        args: [[3, 2, 4], 6],
        expected: [1, 2],
        explanation: "nums[1] + nums[2] = 2 + 4 = 6",
      },
    ],
    constraints: "2 <= nums.length <= 10^4 | -10^9 <= nums[i] <= 10^9 | Only one valid answer exists.",
    starter_code: `function solve(nums, target) {
  // Your solution here
}`,
  },
  {
    topic: "Arrays",
    sub_topic: "Greedy",
    difficulty: "easy",
    order_num: 2,
    problem_statement: `You are given an array \`prices\` where \`prices[i]\` is the price of a stock on day \`i\`. You want to maximize profit by choosing a single day to buy and a single day to sell in the future. Return the maximum profit. If no profit is possible, return \`0\`.`,
    examples: [
      {
        args: [[7, 1, 5, 3, 6, 4]],
        expected: 5,
        explanation: "Buy on day 2 (price=1), sell on day 5 (price=6). Profit = 6 - 1 = 5.",
      },
      {
        args: [[7, 6, 4, 3, 1]],
        expected: 0,
        explanation: "Prices only go down. No profit possible.",
      },
    ],
    constraints: "1 <= prices.length <= 10^5 | 0 <= prices[i] <= 10^4",
    starter_code: `function solve(prices) {
  // Your solution here
}`,
  },
  {
    topic: "Arrays",
    sub_topic: "Hashing",
    difficulty: "easy",
    order_num: 3,
    problem_statement: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice in the array, and return \`false\` if every element is distinct.`,
    examples: [
      {
        args: [[1, 2, 3, 1]],
        expected: true,
        explanation: "1 appears at index 0 and 3.",
      },
      {
        args: [[1, 2, 3, 4]],
        expected: false,
        explanation: "All elements are distinct.",
      },
    ],
    constraints: "1 <= nums.length <= 10^5 | -10^9 <= nums[i] <= 10^9",
    starter_code: `function solve(nums) {
  // Your solution here
}`,
  },
  {
    topic: "Arrays",
    sub_topic: "Prefix/Suffix Product",
    difficulty: "medium",
    order_num: 4,
    problem_statement: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all elements of \`nums\` except \`nums[i]\`. You must solve it without using division and in O(n) time.`,
    examples: [
      {
        args: [[1, 2, 3, 4]],
        expected: [24, 12, 8, 6],
        explanation: "answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, etc.",
      },
      {
        args: [[-1, 1, 0, -3, 3]],
        expected: [0, 0, 9, 0, 0],
        explanation: "Any element with a zero neighbour produces zero.",
      },
    ],
    constraints: "2 <= nums.length <= 10^5 | -30 <= nums[i] <= 30 | The product of any prefix or suffix fits in a 32-bit integer.",
    starter_code: `function solve(nums) {
  // Your solution here
}`,
  },
  {
    topic: "Arrays",
    sub_topic: "Kadane's Algorithm",
    difficulty: "medium",
    order_num: 5,
    problem_statement: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      {
        args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]],
        expected: 6,
        explanation: "The subarray [4,-1,2,1] has the largest sum = 6.",
      },
      {
        args: [[1]],
        expected: 1,
        explanation: "Single element is the subarray.",
      },
    ],
    constraints: "1 <= nums.length <= 10^5 | -10^4 <= nums[i] <= 10^4",
    starter_code: `function solve(nums) {
  // Your solution here
}`,
  },

  // ─── TWO POINTERS (5) ─────────────────────────────────────────────────────
  {
    topic: "Two Pointers",
    sub_topic: "String",
    difficulty: "easy",
    order_num: 6,
    problem_statement: `A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
    examples: [
      {
        args: ["A man, a plan, a canal: Panama"],
        expected: true,
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        args: ["race a car"],
        expected: false,
        explanation: '"raceacar" is not a palindrome.',
      },
    ],
    constraints: "1 <= s.length <= 2 * 10^5 | s consists only of printable ASCII characters.",
    starter_code: `function solve(s) {
  // Your solution here
}`,
  },
  {
    topic: "Two Pointers",
    sub_topic: "Sorted Array",
    difficulty: "medium",
    order_num: 7,
    problem_statement: `Given a 1-indexed array of integers \`numbers\` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific \`target\` number. Return the indices of the two numbers (1-indexed) as an integer array of length 2.`,
    examples: [
      {
        args: [[2, 7, 11, 15], 9],
        expected: [1, 2],
        explanation: "numbers[1] + numbers[2] = 2 + 7 = 9.",
      },
      {
        args: [[2, 3, 4], 6],
        expected: [1, 3],
        explanation: "numbers[1] + numbers[3] = 2 + 4 = 6.",
      },
    ],
    constraints: "2 <= numbers.length <= 3 * 10^4 | -1000 <= numbers[i] <= 1000 | Exactly one solution exists.",
    starter_code: `function solve(numbers, target) {
  // Your solution here
}`,
  },
  {
    topic: "Two Pointers",
    sub_topic: "Sorting",
    difficulty: "medium",
    order_num: 8,
    problem_statement: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`. The solution set must not contain duplicate triplets.`,
    examples: [
      {
        args: [[-1, 0, 1, 2, -1, -4]],
        expected: [[-1, -1, 2], [-1, 0, 1]],
        explanation: "Two valid triplets exist.",
      },
      {
        args: [[0, 1, 1]],
        expected: [],
        explanation: "No triplet sums to zero.",
      },
    ],
    constraints: "3 <= nums.length <= 3000 | -10^5 <= nums[i] <= 10^5",
    starter_code: `function solve(nums) {
  // Your solution here
}`,
  },
  {
    topic: "Two Pointers",
    sub_topic: "Area",
    difficulty: "medium",
    order_num: 9,
    problem_statement: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i\`th line are \`(i, 0)\` and \`(i, height[i])\`. Find two lines that together with the x-axis form a container that holds the most water. Return the maximum amount of water a container can store.`,
    examples: [
      {
        args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
        expected: 49,
        explanation: "Lines at index 1 and 8 form a container with area = min(8,7) * 7 = 49.",
      },
      {
        args: [[1, 1]],
        expected: 1,
        explanation: "Only two lines, area = 1.",
      },
    ],
    constraints: "n == height.length | 2 <= n <= 10^5 | 0 <= height[i] <= 10^4",
    starter_code: `function solve(height) {
  // Your solution here
}`,
  },
  {
    topic: "Two Pointers",
    sub_topic: "Stack/Two-Pass",
    difficulty: "hard",
    order_num: 10,
    problem_statement: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    examples: [
      {
        args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
        expected: 6,
        explanation: "The elevation map traps 6 units of water.",
      },
      {
        args: [[4, 2, 0, 3, 2, 5]],
        expected: 9,
        explanation: "Total trapped water is 9.",
      },
    ],
    constraints: "n == height.length | 1 <= n <= 2 * 10^4 | 0 <= height[i] <= 10^5",
    starter_code: `function solve(height) {
  // Your solution here
}`,
  },

  // ─── SLIDING WINDOW (5) ───────────────────────────────────────────────────
  {
    topic: "Sliding Window",
    sub_topic: "Fixed Size",
    difficulty: "easy",
    order_num: 11,
    problem_statement: `Given an array of integers \`nums\` and an integer \`k\`, find the maximum sum of any contiguous subarray of size \`k\`.`,
    examples: [
      {
        args: [[2, 1, 5, 1, 3, 2], 3],
        expected: 9,
        explanation: "Subarray [5,1,3] has sum 9.",
      },
      {
        args: [[2, 3, 4, 1, 5], 2],
        expected: 7,
        explanation: "Subarray [3,4] has sum 7.",
      },
    ],
    constraints: "1 <= k <= nums.length <= 10^5 | -10^4 <= nums[i] <= 10^4",
    starter_code: `function solve(nums, k) {
  // Your solution here
}`,
  },
  {
    topic: "Sliding Window",
    sub_topic: "Variable Size",
    difficulty: "medium",
    order_num: 12,
    problem_statement: `Given a string \`s\`, find the length of the longest substring without repeating characters.`,
    examples: [
      {
        args: ["abcabcbb"],
        expected: 3,
        explanation: 'The answer is "abc", with length 3.',
      },
      {
        args: ["bbbbb"],
        expected: 1,
        explanation: 'The answer is "b", with length 1.',
      },
    ],
    constraints: "0 <= s.length <= 5 * 10^4 | s consists of English letters, digits, symbols and spaces.",
    starter_code: `function solve(s) {
  // Your solution here
}`,
  },
  {
    topic: "Sliding Window",
    sub_topic: "Variable Size",
    difficulty: "hard",
    order_num: 13,
    problem_statement: `Given two strings \`s\` and \`t\` of lengths \`m\` and \`n\` respectively, return the minimum window substring of \`s\` such that every character in \`t\` (including duplicates) is included in the window. If there is no such substring, return the empty string \`""\`.`,
    examples: [
      {
        args: ["ADOBECODEBANC", "ABC"],
        expected: "BANC",
        explanation: 'The minimum window substring is "BANC".',
      },
      {
        args: ["a", "a"],
        expected: "a",
        explanation: "The entire string is the answer.",
      },
    ],
    constraints: "m == s.length | n == t.length | 1 <= m, n <= 10^5 | s and t consist of uppercase and lowercase English letters.",
    starter_code: `function solve(s, t) {
  // Your solution here
}`,
  },
  {
    topic: "Sliding Window",
    sub_topic: "Anagram",
    difficulty: "medium",
    order_num: 14,
    problem_statement: `Given two strings \`s\` and \`p\`, return an array of all the start indices of \`p\`'s anagrams in \`s\`. You may return the answer in any order.`,
    examples: [
      {
        args: ["cbaebabacd", "abc"],
        expected: [0, 6],
        explanation: 'Anagram "cba" starts at index 0. Anagram "bac" starts at index 6.',
      },
      {
        args: ["abab", "ab"],
        expected: [0, 1, 2],
        explanation: "Three anagrams found.",
      },
    ],
    constraints: "1 <= s.length, p.length <= 3 * 10^4 | s and p consist of lowercase English letters.",
    starter_code: `function solve(s, p) {
  // Your solution here
}`,
  },
  {
    topic: "Sliding Window",
    sub_topic: "Monotonic Deque",
    difficulty: "hard",
    order_num: 15,
    problem_statement: `You are given an array of integers \`nums\` and an integer \`k\`. There is a sliding window of size \`k\` which moves from the very left to the very right of \`nums\`. Return the maximum value in each window position.`,
    examples: [
      {
        args: [[1, 3, -1, -3, 5, 3, 6, 7], 3],
        expected: [3, 3, 5, 5, 6, 7],
        explanation: "Window moves: [1,3,-1]=3, [3,-1,-3]=3, [-1,-3,5]=5, [-3,5,3]=5, [5,3,6]=6, [3,6,7]=7.",
      },
      {
        args: [[1], 1],
        expected: [1],
        explanation: "Single element.",
      },
    ],
    constraints: "1 <= nums.length <= 10^5 | -10^4 <= nums[i] <= 10^4 | 1 <= k <= nums.length",
    starter_code: `function solve(nums, k) {
  // Your solution here
}`,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing levels so re-running is safe
    await client.query("DELETE FROM levels");

    for (const p of problems) {
      await client.query(
        `INSERT INTO levels (topic, sub_topic, difficulty, order_num, problem_statement, examples, constraints, starter_code)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          p.topic,
          p.sub_topic,
          p.difficulty,
          p.order_num,
          p.problem_statement,
          JSON.stringify(p.examples),
          p.constraints,
          p.starter_code,
        ]
      );
      console.log(`  ✓  [${p.order_num.toString().padStart(2, "0")}] ${p.topic} — ${p.problem_statement.split(" ").slice(0, 6).join(" ")}...`);
    }

    await client.query("COMMIT");
    console.log(`\n✅  Seeded ${problems.length} problems successfully.\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌  Seed failed, rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
