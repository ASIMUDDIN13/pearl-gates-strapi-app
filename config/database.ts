export default ({ env }) => {
  if (env('DATABASE_URL')) {
    return {
      connection: {
        client: 'postgres',
        connection: {
          connectionString: env('DATABASE_URL'),
          ssl: { rejectUnauthorized: false },
        },
        debug: false,
      },
    };
  }
  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: env(
          'DATABASE_FILENAME',
          '.tmp/data.db'
        ),
      },
      useNullAsDefault: true,
      debug: false,
    },
  };
};
