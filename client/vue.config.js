module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  devServer: {
    https: true
  },
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = "BLPI StructureRadar";
        return args;
      })
  }
}