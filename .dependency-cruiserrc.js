module.exports = {
  extends: "dependency-cruiser/configs/recommended",
  fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  exclude: {
    dynamic: true,
    modules: ["node_modules", "generated"]
  },
  sourceLocation: true
};