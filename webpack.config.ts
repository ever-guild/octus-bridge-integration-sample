import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WebpackDevServer from 'webpack-dev-server';

type WebpackConfig = webpack.Configuration & {devServer?: WebpackDevServer.Configuration};

export default (_: any, options: any): WebpackConfig => {
    const config: webpack.Configuration = {};

    config.entry = {
        index: path.resolve(__dirname, 'src/index'),
    };

    config.stats = 'errors-warnings';

    config.output = {
        path: path.resolve(__dirname, 'dist'),
        filename: 'js/[name]-[contenthash:6].js',
        publicPath: '/',
        clean: true,
    };

    config.plugins = [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
    ];

    config.plugins.push(
        new HtmlWebpackPlugin({
            title: 'Simple bridge example',
            filename: path.resolve(__dirname, 'dist/index.html'),
            template: 'public/index.html',
            inject: false,
        }),
    );

    config.module = {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: 'babel-loader',
            },
            {
                test: /\.wasm$/,
                type: 'javascript/auto',
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].[hash].[ext]',
                            outputPath: 'wasm/',
                            esModule: false,
                        },
                    },
                ],
            },
            {
                test: /\.css$/i,
                exclude: /\.module.(css)$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(scss)$/i,
                exclude: /\.module.(s[ac]ss)$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|webp|svg|woff2?)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        publicPath: '/assets/',
                        outputPath: 'assets/',
                        esModule: false,
                        name: '[hash:16].[ext]',
                    },
                },
            },
        ],
    };

    config.resolve = {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },

        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.scss', '.css'],

        fallback: {
            assert: require.resolve('assert'),
            buffer: require.resolve('buffer/'),
            crypto: require.resolve('crypto-browserify'),
            http: require.resolve('stream-http'),
            https: require.resolve('https-browserify'),
            os: require.resolve('os-browserify/browser'),
            process: require.resolve('process/browser'),
            stream: require.resolve('stream-browserify'),
            url: require.resolve('url'),
            util: require.resolve('util'),
            events: require.resolve('events'),
        },

        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    };

    if (options.mode === 'development') {
        config.devtool = 'inline-source-map';
        config.devServer = {
            host: '127.0.0.1',
            port: '8080',
            historyApiFallback: true,
            liveReload: true,
            hot: false,
            client: {
                overlay: false,
            },
        };
    }

    return config;
};
