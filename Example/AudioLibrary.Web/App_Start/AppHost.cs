using System.Configuration;
using System.Web.Mvc;
using AudioLibrary.BusinessLogic;
using AudioLibrary.BusinessLogic.Contracts;
using AudioLibrary.DataContext.OrmLiteRepositories;
using AudioLibrary.DataContext.Repositories;
using AudioLibrary.DataInterface;
using AudioLibrary.Web.App_Start;
using AudioLibrary.Web.RestServices;
using Funq;
using ServiceStack.CacheAccess;
using ServiceStack.CacheAccess.Providers;
using ServiceStack.Logging;
using ServiceStack.Logging.Elmah;
using ServiceStack.Logging.Support.Logging;
using ServiceStack.Mvc;
using ServiceStack.OrmLite;
using ServiceStack.ServiceInterface;
using ServiceStack.ServiceInterface.Auth;
using ServiceStack.Text;
using ServiceStack.WebHost.Endpoints;
using WebActivator;

[assembly: PreApplicationStartMethod(typeof (AppHost), "Start")]
/**
 * Entire ServiceStack Starter Template configured with a 'Hello' Web Service and a 'Todo' Rest Service.
 *
 * Auto-Generated Metadata API page at: /metadata
 * See other complete web service examples at: https://github.com/ServiceStack/ServiceStack.Examples
 */

namespace AudioLibrary.Web.App_Start
{
    //A customizeable typed UserSession that can be extended with your own properties
    //To access ServiceStack's Session, Cache, etc from MVC Controllers inherit from ControllerBase<CustomUserSession>
    public class CustomUserSession : AuthUserSession
    {
        public string CustomProperty { get; set; }
    }

    public class AppHost : AppHostBase
    {
        public AppHost() //Tell ServiceStack the name and where to find your web services
            : base("Application Rest Service", typeof (ToDoRestService).Assembly)
        {
        }

        public override void Configure(Container container)
        {
            //Set JSON web services to return idiomatic JSON camelCase properties
            JsConfig.EmitCamelCaseNames = false;

            //Uncomment to change the default ServiceStack configuration
            //SetConfig(new EndpointHostConfig {
            //});

            //Use Elmah with ServiceStack
            LogManager.LogFactory = new ElmahLogFactory(new NullLogFactory());

            //Make the default lifetime of objects limited to request
            container.DefaultReuse = ReuseScope.Request;

            //Uncomment to use Entity Framework
            //RegisterEfServicesAndRepositories(container);
            //RegisterOrmLiteServicesAndRepositories(container);
            //RegisterCacheAndStorage(container);

            //Enable Authentication
            //ConfigureAuth(container);

            //Set MVC to use the same Funq IOC as ServiceStack
            ControllerBuilder.Current.SetControllerFactory(new FunqControllerFactory(container));
        }

        private void RegisterOrmLiteServicesAndRepositories(Container container)
        {
            string connectionString = ConfigurationManager.ConnectionStrings["DataContext"].ConnectionString;
            //repositories
            container.Register<IToDoRepository>(c => new ToDoOrmLiteRepository(c.Resolve<IDbConnectionFactory>()));
            //database
            OrmLiteConfigure.Initialize(container, connectionString);
            //services
            container.Register<IToDoService>(c => new ToDoService(c.Resolve<IToDoRepository>() as ToDoOrmLiteRepository));
        }

        private void RegisterEfServicesAndRepositories(Container container)
        {
            //Make the default lifetime of objects limited to request
            string connectionString = ConfigurationManager.ConnectionStrings["DataContext"].ConnectionString;

            //---Entity Framework (Uncomment to use)
            //database
            EfConfigure.Initialize(connectionString);
            container.Register<IUnitOfWork>(c => new DataContext.DataContext());
            //repositories
            container.Register<IToDoRepository>(c => new ToDoRepository(c.Resolve<IUnitOfWork>()));
            //services
            container.Register<IToDoService>(c => new ToDoService(c.Resolve<IToDoRepository>() as ToDoRepository));
        }

        /* Uncomment to enable ServiceStack Authentication and CustomUserSession
		private void ConfigureAuth(Funq.Container container)
		{
			var appSettings = new AppSettings();

			//Default route: /auth/{provider}
			Plugins.Add(new AuthFeature(this, () => new CustomUserSession(),
				new IAuthProvider[] {
					new CredentialsAuthProvider(appSettings), 
					new FacebookAuthProvider(appSettings), 
					new TwitterAuthProvider(appSettings), 
					new BasicAuthProvider(appSettings), 
				})); 

			//Default route: /register
			Plugins.Add(new RegistrationFeature()); 

			//Requires ConnectionString configured in Web.Config
			var connectionString = ConfigurationManager.ConnectionStrings["AppDb"].ConnectionString;
			container.Register<IDbConnectionFactory>(c =>
				new OrmLiteConnectionFactory(connectionString, SqlServerDialect.Provider));

			container.Register<IUserAuthRepository>(c =>
				new OrmLiteAuthRepository(c.Resolve<IDbConnectionFactory>()));

			var authRepo = (OrmLiteAuthRepository)container.Resolve<IUserAuthRepository>();
			authRepo.CreateMissingTables();
		}
		*/

        private void RegisterCacheAndStorage(Container container)
        {
            //Give cache client and session factory lifetime 
            container.Register<ICacheClient>(c => new MemoryCacheClient()).ReusedWithin(ReuseScope.Container);
            container.Register<ISessionFactory>(c => new SessionFactory(c.Resolve<ICacheClient>()))
                     .ReusedWithin(ReuseScope.Container);
        }

        public static void Start()
        {
            new AppHost().Init();
        }
    }
}